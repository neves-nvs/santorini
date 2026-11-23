import { Board, BoardSnapshot } from "./Board.ts";
import { Move } from "./Move.ts";
import { GameContext, GameState, applyMove, availableMoves, isTrapped } from "./rules.ts";
import { GameId, GameOutcome, GamePhase, GameStatus, Seat, UserId, asSeat, isWinReason } from "./types.ts";
import { Player } from "./Player.ts";

import { GameEvent } from "./GameEvent.ts";
import { GameRuleError } from "./errors.ts";

/**
 * Game Aggregate Root
 *
 * Holds full game state and encapsulates all game rules.
 * Pure domain logic with no external dependencies.
 */
export class Game {
  private constructor(
    public readonly id: GameId,
    public readonly creatorId: UserId,
    public readonly maxPlayers: number,
    private _status: GameStatus,
    private _phase: GamePhase | null,
    private _currentSeat: Seat | null,
    private _turnNumber: number,
    private _placingTurnsCompleted: number,
    private _board: Board,
    private _players: Player[],
    private _version: number,
    private _outcome: GameOutcome | null = null,
    private _lastMovedWorkerId: number | null = null,
    private _lastMovedWorkerPosition: { x: number; y: number } | null = null,
  ) {}

  // Factory methods
  static create(id: GameId, creatorId: UserId, maxPlayers: number): Game {
    return new Game(
      id,
      creatorId,
      maxPlayers,
      "waiting",
      null,
      null,
      0,
      0,
      Board.createEmpty(),
      [],
      1,
      null,
      null,
      null,
    );
  }

  static fromSnapshot(snapshot: GameSnapshot): Game {
    return new Game(
      snapshot.id,
      snapshot.creatorId,
      snapshot.maxPlayers,
      snapshot.status,
      snapshot.phase,
      snapshot.currentSeat,
      snapshot.turnNumber,
      snapshot.placingTurnsCompleted,
      Board.fromSnapshot(snapshot.board),
      [...snapshot.players],
      snapshot.version,
      outcomeOf(snapshot),
      snapshot.lastMovedWorkerId,
      snapshot.lastMovedWorkerPosition,
    );
  }

  // Core game operations
  applyMove(seat: Seat, move: Move): GameEvent[] {
    this.validateMove(move);

    const result = applyMove(this.toState(), this.context, seat, move);
    if (!result.ok) {
      throw new GameRuleError(result.error, result.code);
    }

    this.setState(result.state);
    this._version++;

    if (result.winner !== null) {
      const winnerUserId = this._players[result.winner].userId;
      this._status = "completed";
      this._outcome = { winnerUserId, reason: "win_condition" };
      this.assertInvariants();
      return [new GameEvent("GameFinished", { winnerUserId, reason: "win_condition" })];
    }

    this.assertInvariants();
    return [new GameEvent("MovePlayed", { seat, move, turnNumber: this._turnNumber })];
  }

  /**
   * Generate all available moves for the current player based on phase.
   */
  getAvailableMoves(): Move[] {
    return this._status === "in-progress" ? availableMoves(this.toState()) : [];
  }

  // Getters
  get status(): GameStatus {
    return this._status;
  }
  get phase(): GamePhase | null {
    return this._phase;
  }
  get currentSeat(): Seat | null {
    return this._currentSeat;
  }
  get turnNumber(): number {
    return this._turnNumber;
  }
  get placingTurnsCompleted(): number {
    return this._placingTurnsCompleted;
  }
  get version(): number {
    return this._version;
  }
  get board(): Board {
    return this._board;
  }
  get players(): readonly Player[] {
    return this._players;
  }
  get outcome(): GameOutcome | null {
    return this._outcome;
  }
  get lastMovedWorkerId(): number | null {
    return this._lastMovedWorkerId;
  }
  get lastMovedWorkerPosition(): { x: number; y: number } | null {
    return this._lastMovedWorkerPosition;
  }

  /**
   * Check if the current player is trapped (has no valid moves).
   * Only applicable during moving phase.
   */
  isCurrentPlayerTrapped(): boolean {
    return this._status === "in-progress" && isTrapped(this.toState());
  }

  /**
   * Check and handle the case where current player has no valid moves.
   * If trapped, the game ends and the opponent wins.
   * Returns events if game ended, empty array otherwise.
   */
  checkAndHandleNoMoves(): GameEvent[] {
    if (!this.isCurrentPlayerTrapped()) {
      return [];
    }

    // Find opponent (winner)
    const winnerSeat = this._players.findIndex((_, seat) => seat !== this._currentSeat);
    const winnerUserId = this._players[winnerSeat].userId;

    this._status = "completed";
    this._outcome = { winnerUserId, reason: "opponent_trapped" };
    this._version++;
    this.assertInvariants();

    return [
      new GameEvent("GameFinished", {
        winnerUserId,
        reason: "opponent_trapped",
        trappedSeat: this._currentSeat,
      }),
    ];
  }

  // Game lifecycle
  addPlayer(player: Player): GameEvent[] {
    if (this._players.length >= this.maxPlayers) {
      throw new GameRuleError("Game is full", "game_full");
    }

    this._players.push(player);
    this.resetPlayerReadiness();
    this._version++;
    const events: GameEvent[] = [];

    if (this._players.length === this.maxPlayers) {
      events.push(new GameEvent("GameReady", { gameId: this.id }));
    }

    return events;
  }

  /**
   * Remove a player from a waiting game. A changed roster requires every remaining player to ready again.
   */
  removePlayer(userId: UserId): GameEvent[] {
    if (this._status !== "waiting") {
      throw new GameRuleError("Cannot remove player - game is not waiting");
    }

    const seat = this._players.findIndex((player) => player.userId === userId);
    if (seat === -1) {
      throw new GameRuleError("Player not found in game", "not_in_game");
    }

    this._players.splice(seat, 1);
    this.resetPlayerReadiness();
    this._version++;

    return [new GameEvent("PlayerLeft", { gameId: this.id, userId })];
  }

  /**
   * Set a player's ready status.
   * When all players are ready, the game automatically starts.
   *
   * Flow:
   * 1. Players join a game via WebSocket connection
   * 2. Each player must confirm/accept the game (to verify opponents)
   * 3. Once ALL players have confirmed, the game auto-starts
   */
  setPlayerReady(seat: Seat, ready: boolean): GameEvent[] {
    if (this._status !== "waiting") {
      throw new GameRuleError("Cannot change ready status - game is not waiting");
    }

    const player = this._players[seat];
    if (!player) {
      throw new GameRuleError("Player not found in game", "not_in_game");
    }

    player.setReady(ready);
    this._version++;

    const events: GameEvent[] = [
      new GameEvent("PlayerReadyChanged", {
        gameId: this.id,
        seat,
        ready,
        readyStatuses: this.getReadyStatuses(),
      }),
    ];

    // Auto-start when all players are ready
    if (ready && this.areAllPlayersReady()) {
      events.push(...this.startGame());
    }

    return events;
  }

  /**
   * Check if all players are ready
   */
  areAllPlayersReady(): boolean {
    return this._players.length === this.maxPlayers && this._players.every((player) => player.isReady);
  }

  /**
   * Get ready status for all players
   */
  getReadyStatuses(): Array<{ seat: Seat; ready: boolean }> {
    return this._players.map((player, seat) => ({ seat: asSeat(seat), ready: player.isReady }));
  }

  startGame(): GameEvent[] {
    if (this._status !== "waiting") {
      throw new GameRuleError("Game cannot be started");
    }
    if (this._players.length !== this.maxPlayers) {
      throw new GameRuleError(`Cannot start: need ${this.maxPlayers} players, have ${this._players.length}`);
    }
    if (!this.areAllPlayersReady()) {
      throw new GameRuleError("Cannot start: not all players are ready");
    }

    this._status = "in-progress";
    this._phase = "placing";
    this._currentSeat = asSeat(0);
    this._version++;

    this.assertInvariants();
    return [new GameEvent("GameStarted", { gameId: this.id, firstSeat: this._currentSeat })];
  }

  // Private methods

  /**
   * Assert game invariants. Called after state-changing operations.
   * Throws if any invariant is violated.
   */
  private assertInvariants(): void {
    // Invariant: in-progress requires full player count, all ready, valid current player
    if (this._status === "in-progress") {
      if (this._players.length !== this.maxPlayers) {
        throw new Error(`Invariant violated: in-progress game has ${this._players.length}/${this.maxPlayers} players`);
      }
      if (this._currentSeat === null || this._currentSeat >= this._players.length) {
        throw new Error("Invariant violated: in-progress game has no valid current player");
      }
      if (!this._phase) {
        throw new Error("Invariant violated: in-progress game has no phase");
      }
    }

    // Invariant: waiting cannot have currentPlayer or phase
    if (this._status === "waiting") {
      if (this._currentSeat !== null) {
        throw new Error("Invariant violated: waiting game has currentSeat set");
      }
      if (this._phase !== null) {
        throw new Error("Invariant violated: waiting game has phase set");
      }
    }
  }

  private resetPlayerReadiness(): void {
    for (const player of this._players) {
      player.setReady(false);
    }
  }

  private validateMove(move: Move): void {
    if (this._status !== "in-progress") {
      throw new GameRuleError("Game is not in progress");
    }

    if (!move) {
      throw new GameRuleError("Move is required");
    }
  }

  private get context(): GameContext {
    return { playerCount: this.maxPlayers };
  }

  private toState(): GameState {
    if (this._phase === null || this._currentSeat === null) {
      throw new Error("A game that has not started has no state");
    }

    return {
      board: this._board.toSnapshot(),
      phase: this._phase,
      currentSeat: this._currentSeat,
      turnNumber: this._turnNumber,
      placingTurnsCompleted: this._placingTurnsCompleted,
      lastMovedWorker:
        this._lastMovedWorkerId !== null && this._lastMovedWorkerPosition !== null
          ? { workerId: this._lastMovedWorkerId, position: this._lastMovedWorkerPosition }
          : null,
    };
  }

  private setState(state: GameState): void {
    this._board = Board.fromSnapshot(state.board);
    this._phase = state.phase;
    this._currentSeat = state.currentSeat;
    this._turnNumber = state.turnNumber;
    this._placingTurnsCompleted = state.placingTurnsCompleted;
    this._lastMovedWorkerId = state.lastMovedWorker?.workerId ?? null;
    this._lastMovedWorkerPosition = state.lastMovedWorker?.position ?? null;
  }

  // Snapshot for persistence
  toSnapshot(): GameSnapshot {
    return {
      id: this.id,
      creatorId: this.creatorId,
      maxPlayers: this.maxPlayers,
      status: this._status,
      phase: this._phase,
      currentSeat: this._currentSeat,
      turnNumber: this._turnNumber,
      placingTurnsCompleted: this._placingTurnsCompleted,
      board: this._board.toSnapshot(),
      players: [...this._players],
      version: this._version,
      winnerUserId: this._outcome?.winnerUserId ?? null,
      winReason: this._outcome?.reason ?? null,
      lastMovedWorkerId: this._lastMovedWorkerId,
      lastMovedWorkerPosition: this._lastMovedWorkerPosition,
    };
  }
}

function outcomeOf(snapshot: GameSnapshot): GameOutcome | null {
  if (snapshot.status !== "completed") {
    if (snapshot.winnerUserId !== null || snapshot.winReason !== null) {
      throw new Error(`Invalid snapshot: game ${snapshot.id} has a winner but is not completed`);
    }
    return null;
  }
  if (snapshot.winnerUserId === null) {
    throw new Error(`Invalid snapshot: completed game ${snapshot.id} has no winner`);
  }
  if (!isWinReason(snapshot.winReason)) {
    throw new Error(`Invalid snapshot: completed game ${snapshot.id} has an unknown win reason: ${snapshot.winReason}`);
  }
  return { winnerUserId: snapshot.winnerUserId, reason: snapshot.winReason };
}

export interface GameSnapshot {
  id: GameId;
  creatorId: UserId;
  maxPlayers: number;
  status: GameStatus;
  phase: GamePhase | null;
  currentSeat: Seat | null;
  turnNumber: number;
  placingTurnsCompleted: number;
  board: BoardSnapshot;
  players: Player[];
  version: number;
  winnerUserId: UserId | null;
  winReason: string | null;
  lastMovedWorkerId: number | null;
  lastMovedWorkerPosition: { x: number; y: number } | null;
}
