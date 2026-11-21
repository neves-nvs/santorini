import { Board, BoardSnapshot, MoveResult } from "./Board.ts";
import { BuildMove, Move, MoveWorkerMove, PlaceWorkerMove } from "./Move.ts";
import { DefaultTurnPolicy } from "./TurnPolicy.ts";
import { GameId, GameOutcome, GamePhase, GameSetup, GameStatus, Seat, UserId, asSeat, isWinReason } from "./types.ts";
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

  private readonly _turnPolicy = new DefaultTurnPolicy();

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

  /** A game that is already in progress: every player is seated and the first seat places a worker. */
  static start(id: GameId, setup: GameSetup): Game {
    if (setup.players.length < 2) {
      throw new GameRuleError("A game needs at least two players");
    }

    const players = setup.players.map((userId) => {
      const player = new Player(userId);
      player.setReady(true);
      return player;
    });

    return new Game(
      id,
      setup.creatorId,
      players.length,
      "in-progress",
      "placing",
      asSeat(0),
      0,
      0,
      Board.createEmpty(),
      players,
      1,
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
    this.validateMove(seat, move);

    const events: GameEvent[] = [];

    // Apply move to board and update state
    const moveResult = this._board.applyMove(move, seat);

    // Check if move was successful
    if (!moveResult.success) {
      throw new GameRuleError(moveResult.error || "Move failed", "illegal_move");
    }

    // Update game state based on move result
    if (moveResult.isWin) {
      this._status = "completed";
      const winnerUserId = this._players[seat].userId;
      this._outcome = { winnerUserId, reason: "win_condition" };
      this._version++;
      this.assertInvariants();
      events.push(new GameEvent("GameFinished", { winnerUserId, reason: "win_condition" }));
    } else {
      // Advance turn state
      this.advanceTurn(move, moveResult);
      this._version++;
      this.assertInvariants();
      events.push(new GameEvent("MovePlayed", { seat, move, turnNumber: this._turnNumber }));
    }
    return events;
  }

  /**
   * Generate all available moves for the current player based on phase.
   * Pure domain logic - no external dependencies.
   */
  getAvailableMoves(): Move[] {
    if (this._status !== "in-progress" || this._currentSeat === null) {
      return [];
    }

    switch (this._phase) {
      case "placing":
        return this.generatePlacementMoves(this._currentSeat);
      case "moving":
        return this.generateMovementMoves(this._currentSeat);
      case "building":
        return this.generateBuildMoves(this._currentSeat);
      default:
        return [];
    }
  }

  private generatePlacementMoves(seat: Seat): Move[] {
    const moves: Move[] = [];
    const workersPlaced = this.countWorkersForPlayer(seat);

    if (workersPlaced >= 2) return moves;

    const nextWorkerId = workersPlaced + 1;

    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (!this._board.isPositionOccupied(x, y)) {
          moves.push(new PlaceWorkerMove(seat, { x, y }, nextWorkerId));
        }
      }
    }
    return moves;
  }

  private generateMovementMoves(seat: Seat): Move[] {
    const moves: Move[] = [];

    for (const [key, workerPos] of this._board.workers) {
      const [ownerIdStr, workerIdStr] = key.split("-");
      const ownerId = parseInt(ownerIdStr);
      const workerId = parseInt(workerIdStr);

      if (ownerId !== seat) continue;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;

          const toX = workerPos.x + dx;
          const toY = workerPos.y + dy;

          if (this.isValidMove(workerPos.x, workerPos.y, toX, toY)) {
            moves.push(new MoveWorkerMove(seat, { x: toX, y: toY }, workerId, { x: workerPos.x, y: workerPos.y }));
          }
        }
      }
    }
    return moves;
  }

  private generateBuildMoves(seat: Seat): Move[] {
    const moves: Move[] = [];

    if (!this._lastMovedWorkerPosition || !this._lastMovedWorkerId) {
      return moves;
    }

    const { x: wx, y: wy } = this._lastMovedWorkerPosition;
    const workerId = this._lastMovedWorkerId;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;

        const bx = wx + dx;
        const by = wy + dy;

        if (this.isValidBuildPosition(bx, by)) {
          const cell = this._board.getCell(bx, by);
          const height = cell?.height ?? 0;

          if (height < 3) {
            moves.push(new BuildMove(seat, { x: bx, y: by }, "block", workerId));
          }
          if (height === 3) {
            moves.push(new BuildMove(seat, { x: bx, y: by }, "dome", workerId));
          }
        }
      }
    }
    return moves;
  }

  private countWorkersForPlayer(seat: Seat): number {
    let count = 0;
    for (const [key] of this._board.workers) {
      const [ownerIdStr] = key.split("-");
      if (parseInt(ownerIdStr) === seat) count++;
    }
    return count;
  }

  private isValidMove(fromX: number, fromY: number, toX: number, toY: number): boolean {
    if (!this._board.isValidPosition(toX, toY)) return false;
    if (this._board.isPositionOccupied(toX, toY)) return false;

    const fromCell = this._board.getCell(fromX, fromY);
    const toCell = this._board.getCell(toX, toY);

    if (!fromCell || !toCell) return false;
    if (toCell.hasDome) return false;
    if (toCell.height > fromCell.height + 1) return false;

    return true;
  }

  private isValidBuildPosition(x: number, y: number): boolean {
    if (!this._board.isValidPosition(x, y)) return false;
    if (this._board.isPositionOccupied(x, y)) return false;

    const cell = this._board.getCell(x, y);
    if (!cell || cell.hasDome) return false;

    return true;
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
    if (this._status !== "in-progress" || this._phase !== "moving" || this._currentSeat === null) {
      return false;
    }
    return this.getAvailableMoves().length === 0;
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
    this._version++;
    const events: GameEvent[] = [];

    if (this._players.length === this.maxPlayers) {
      events.push(new GameEvent("GameReady", { gameId: this.id }));
    }

    return events;
  }

  /**
   * Remove a player from the game.
   * Only allowed if game is in 'waiting' status and player hasn't readied.
   */
  removePlayer(userId: UserId): GameEvent[] {
    if (this._status !== "waiting") {
      throw new GameRuleError("Cannot remove player - game is not waiting");
    }

    const seat = this._players.findIndex((player) => player.userId === userId);
    if (seat === -1) {
      throw new GameRuleError("Player not found in game", "not_in_game");
    }

    if (this._players[seat].isReady) {
      throw new GameRuleError("Cannot remove player who has already confirmed ready");
    }

    this._players.splice(seat, 1);
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

  private validateMove(seat: Seat, move: Move): void {
    if (this._status !== "in-progress") {
      throw new GameRuleError("Game is not in progress");
    }

    if (this._currentSeat !== seat) {
      throw new GameRuleError("Not your turn", "not_your_turn");
    }

    if (!move) {
      throw new GameRuleError("Move is required");
    }

    // Additional move validation would go here
  }

  private advanceTurn(move: Move, moveResult: MoveResult): void {
    if (!this._phase) {
      throw new Error("Cannot advance turn: game phase not set");
    }

    const advancement = this._turnPolicy.advanceTurn(this, move, moveResult);

    this._currentSeat = advancement.nextSeat;
    this._phase = advancement.nextPhase;
    this._turnNumber = advancement.turnNumber;
    this._placingTurnsCompleted = advancement.placingTurnsCompleted;
    this._lastMovedWorkerId = advancement.lastMovedWorkerId || null;
    this._lastMovedWorkerPosition = advancement.lastMovedWorkerPosition || null;
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
