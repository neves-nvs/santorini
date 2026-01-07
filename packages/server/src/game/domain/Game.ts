import { Board, BoardSnapshot, MoveResult } from './Board';
import { BuildMove, Move, MoveWorkerMove, PlaceWorkerMove } from './Move';
import { DefaultTurnPolicy, TurnPolicy } from './TurnPolicy';
import { GamePhase, GameStatus } from './types';
import { Player, PlayerId } from './Player';

import { GameEvent } from './GameEvent';

/**
 * Game Aggregate Root
 * 
 * Holds full game state and encapsulates all game rules.
 * Pure domain logic with no external dependencies.
 */
export class Game {
  private constructor(
    public readonly id: number,
    public readonly creatorId: number,
    public readonly maxPlayers: number,
    private _status: GameStatus,
    private _phase: GamePhase | null,
    private _currentPlayerId: PlayerId | null,
    private _turnNumber: number,
    private _placingTurnsCompleted: number,
    private _board: Board,
    private _players: Map<PlayerId, Player>,
    private _version: number,
    private _winnerId: PlayerId | null = null,
    private _winReason: string | null = null,
    private _lastMovedWorkerId: number | null = null,
    private _lastMovedWorkerPosition: { x: number; y: number } | null = null,
    private _createdAt: Date = new Date(),
    private _startedAt: Date | null = null,
    private _finishedAt: Date | null = null,
    private _turnPolicy: TurnPolicy = new DefaultTurnPolicy()
  ) {}

  // Factory methods
  static create(id: number, creatorId: number, maxPlayers: number): Game {
    return new Game(
      id,
      creatorId,
      maxPlayers,
      'waiting',
      null,
      null,
      0,
      0,
      Board.createEmpty(),
      new Map(),
      1
    );
  }

  static fromSnapshot(snapshot: GameSnapshot, turnPolicy?: TurnPolicy): Game {
    const players = new Map();
    snapshot.players.forEach(p => players.set(p.id, p));

    return new Game(
      snapshot.id,
      snapshot.creatorId,
      snapshot.maxPlayers,
      snapshot.status,
      snapshot.phase,
      snapshot.currentPlayerId,
      snapshot.turnNumber,
      snapshot.placingTurnsCompleted,
      Board.fromSnapshot(snapshot.board),
      players,
      snapshot.version,
      snapshot.winnerId,
      snapshot.winReason,
      snapshot.lastMovedWorkerId,
      snapshot.lastMovedWorkerPosition,
      snapshot.createdAt,
      snapshot.startedAt,
      snapshot.finishedAt,
      turnPolicy
    );
  }

  /**
   * Set a custom turn policy (useful for god powers that affect turn order)
   */
  setTurnPolicy(turnPolicy: TurnPolicy): void {
    this._turnPolicy = turnPolicy;
  }

  // Core game operations
  applyMove(playerId: PlayerId, move: Move): GameEvent[] {
    this.validateMove(playerId, move);

    const events: GameEvent[] = [];

    // Apply move to board and update state
    const moveResult = this._board.applyMove(move, playerId);

    // Check if move was successful
    if (!moveResult.success) {
      throw new Error(moveResult.error || 'Move failed');
    }

    // Update game state based on move result
    if (moveResult.isWin) {
      this._status = 'completed';
      this._winnerId = playerId;
      this._winReason = 'win_condition';
      this._finishedAt = new Date();
      this._version++;
      this.assertInvariants();
      events.push(new GameEvent('GameFinished', { winnerId: playerId, reason: 'win_condition' }));
    } else {
      // Advance turn state
      this.advanceTurn(move, moveResult);
      this._version++;
      this.assertInvariants();
      events.push(new GameEvent('MovePlayed', { playerId, move, turnNumber: this._turnNumber }));
    }
    return events;
  }

  /**
   * Generate all available moves for the current player based on phase.
   * Pure domain logic - no external dependencies.
   */
  getAvailableMoves(): Move[] {
    if (this._status !== 'in-progress' || !this._currentPlayerId) {
      return [];
    }

    switch (this._phase) {
      case 'placing':
        return this.generatePlacementMoves(this._currentPlayerId);
      case 'moving':
        return this.generateMovementMoves(this._currentPlayerId);
      case 'building':
        return this.generateBuildMoves(this._currentPlayerId);
      default:
        return [];
    }
  }

  private generatePlacementMoves(playerId: PlayerId): Move[] {
    const moves: Move[] = [];
    const workersPlaced = this.countWorkersForPlayer(playerId);

    if (workersPlaced >= 2) return moves;

    const nextWorkerId = workersPlaced + 1;

    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (!this._board.isPositionOccupied(x, y)) {
          moves.push(new PlaceWorkerMove(playerId, { x, y }, nextWorkerId));
        }
      }
    }
    return moves;
  }

  private generateMovementMoves(playerId: PlayerId): Move[] {
    const moves: Move[] = [];

    for (const [key, workerPos] of this._board.workers) {
      const [ownerIdStr, workerIdStr] = key.split('-');
      const ownerId = parseInt(ownerIdStr);
      const workerId = parseInt(workerIdStr);

      if (ownerId !== playerId) continue;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;

          const toX = workerPos.x + dx;
          const toY = workerPos.y + dy;

          if (this.isValidMove(workerPos.x, workerPos.y, toX, toY)) {
            moves.push(new MoveWorkerMove(
              playerId,
              { x: toX, y: toY },
              workerId,
              { x: workerPos.x, y: workerPos.y }
            ));
          }
        }
      }
    }
    return moves;
  }

  private generateBuildMoves(playerId: PlayerId): Move[] {
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
            moves.push(new BuildMove(playerId, { x: bx, y: by }, 'block', workerId));
          }
          if (height === 3) {
            moves.push(new BuildMove(playerId, { x: bx, y: by }, 'dome', workerId));
          }
        }
      }
    }
    return moves;
  }

  private countWorkersForPlayer(playerId: PlayerId): number {
    let count = 0;
    for (const [key] of this._board.workers) {
      const [ownerIdStr] = key.split('-');
      if (parseInt(ownerIdStr) === playerId) count++;
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
  get status(): GameStatus { return this._status; }
  get phase(): GamePhase | null { return this._phase; }
  get currentPlayerId(): PlayerId | null { return this._currentPlayerId; }
  get turnNumber(): number { return this._turnNumber; }
  get placingTurnsCompleted(): number { return this._placingTurnsCompleted; }
  get version(): number { return this._version; }
  get board(): Board { return this._board; }
  get players(): ReadonlyMap<PlayerId, Player> { return this._players; }
  get winnerId(): PlayerId | null { return this._winnerId; }
  get winReason(): string | null { return this._winReason; }
  get lastMovedWorkerId(): number | null { return this._lastMovedWorkerId; }
  get lastMovedWorkerPosition(): { x: number; y: number } | null { return this._lastMovedWorkerPosition; }
  get createdAt(): Date { return this._createdAt; }
  get startedAt(): Date | null { return this._startedAt; }
  get finishedAt(): Date | null { return this._finishedAt; }

  /**
   * Check if the current player is trapped (has no valid moves).
   * Only applicable during moving phase.
   */
  isCurrentPlayerTrapped(): boolean {
    if (this._status !== 'in-progress' || this._phase !== 'moving' || !this._currentPlayerId) {
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
    const playerIds = Array.from(this._players.keys());
    const winnerId = playerIds.find(id => id !== this._currentPlayerId)!;

    this._status = 'completed';
    this._winnerId = winnerId;
    this._winReason = 'opponent_trapped';
    this._finishedAt = new Date();
    this._version++;
    this.assertInvariants();

    return [new GameEvent('GameFinished', {
      winnerId,
      reason: 'opponent_trapped',
      trappedPlayerId: this._currentPlayerId
    })];
  }

  // Game lifecycle
  addPlayer(player: Player): GameEvent[] {
    if (this._players.size >= this.maxPlayers) {
      throw new Error('Game is full');
    }

    this._players.set(player.id, player);
    const events: GameEvent[] = [];

    if (this._players.size === this.maxPlayers) {
      events.push(new GameEvent('GameReady', { gameId: this.id }));
    }

    return events;
  }

  /**
   * Remove a player from the game.
   * Only allowed if game is in 'waiting' status and player hasn't readied.
   */
  removePlayer(userId: number): GameEvent[] {
    if (this._status !== 'waiting') {
      throw new Error('Cannot remove player - game is not waiting');
    }

    // Find player by userId
    let playerToRemove: Player | undefined;
    for (const player of this._players.values()) {
      if (player.userId === userId) {
        playerToRemove = player;
        break;
      }
    }

    if (!playerToRemove) {
      throw new Error('Player not found in game');
    }

    if (playerToRemove.isReady) {
      throw new Error('Cannot remove player who has already confirmed ready');
    }

    this._players.delete(playerToRemove.id);
    this._version++;

    return [new GameEvent('PlayerLeft', { gameId: this.id, userId })];
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
  setPlayerReady(playerId: PlayerId, ready: boolean): GameEvent[] {
    if (this._status !== 'waiting') {
      throw new Error('Cannot change ready status - game is not waiting');
    }

    const player = this._players.get(playerId);
    if (!player) {
      throw new Error('Player not found in game');
    }

    player.setReady(ready);
    this._version++;

    const events: GameEvent[] = [
      new GameEvent('PlayerReadyChanged', {
        gameId: this.id,
        playerId,
        ready,
        readyStatuses: this.getReadyStatuses()
      })
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
    if (this._players.size < this.maxPlayers) {
      return false;
    }
    for (const player of this._players.values()) {
      if (!player.isReady) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get ready status for all players
   */
  getReadyStatuses(): Array<{ playerId: number; ready: boolean }> {
    return Array.from(this._players.values()).map(p => ({
      playerId: p.id,
      ready: p.isReady
    }));
  }

  startGame(): GameEvent[] {
    if (this._status !== 'waiting') {
      throw new Error('Game cannot be started');
    }
    if (this._players.size !== this.maxPlayers) {
      throw new Error(`Cannot start: need ${this.maxPlayers} players, have ${this._players.size}`);
    }
    if (!this.areAllPlayersReady()) {
      throw new Error('Cannot start: not all players are ready');
    }

    this._status = 'in-progress';
    this._phase = 'placing';
    this._currentPlayerId = Array.from(this._players.keys())[0];
    this._startedAt = new Date();
    this._version++;

    this.assertInvariants();
    return [new GameEvent('GameStarted', { gameId: this.id, firstPlayerId: this._currentPlayerId })];
  }

  // Private methods

  /**
   * Assert game invariants. Called after state-changing operations.
   * Throws if any invariant is violated.
   */
  private assertInvariants(): void {
    // Invariant: in-progress requires full player count, all ready, valid current player
    if (this._status === 'in-progress') {
      if (this._players.size !== this.maxPlayers) {
        throw new Error(`Invariant violated: in-progress game has ${this._players.size}/${this.maxPlayers} players`);
      }
      if (!this._currentPlayerId || !this._players.has(this._currentPlayerId)) {
        throw new Error('Invariant violated: in-progress game has no valid current player');
      }
      if (!this._phase) {
        throw new Error('Invariant violated: in-progress game has no phase');
      }
      if (!this._startedAt) {
        throw new Error('Invariant violated: in-progress game has no startedAt');
      }
    }

    // Invariant: completed requires winnerId or abort reason
    if (this._status === 'completed') {
      if (!this._finishedAt) {
        throw new Error('Invariant violated: completed game has no finishedAt');
      }
      // winnerId can be null for aborted games, but winReason should indicate why
    }

    // Invariant: waiting cannot have currentPlayer or phase
    if (this._status === 'waiting') {
      if (this._currentPlayerId !== null) {
        throw new Error('Invariant violated: waiting game has currentPlayerId set');
      }
      if (this._phase !== null) {
        throw new Error('Invariant violated: waiting game has phase set');
      }
    }
  }

  private validateMove(playerId: PlayerId, move: Move): void {
    if (this._status !== 'in-progress') {
      throw new Error('Game is not in progress');
    }

    if (this._currentPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    if (!move) {
      throw new Error('Move is required');
    }

    // Additional move validation would go here
  }

  private advanceTurn(move: Move, moveResult: MoveResult): void {
    if (!this._phase) {
      throw new Error('Cannot advance turn: game phase not set');
    }

    const advancement = this._turnPolicy.advanceTurn(this, move, moveResult);

    this._currentPlayerId = advancement.nextPlayerId;
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
      currentPlayerId: this._currentPlayerId,
      turnNumber: this._turnNumber,
      placingTurnsCompleted: this._placingTurnsCompleted,
      board: this._board.toSnapshot(),
      players: Array.from(this._players.values()),
      version: this._version,
      winnerId: this._winnerId,
      winReason: this._winReason,
      lastMovedWorkerId: this._lastMovedWorkerId,
      lastMovedWorkerPosition: this._lastMovedWorkerPosition,
      createdAt: this._createdAt,
      startedAt: this._startedAt,
      finishedAt: this._finishedAt
    };
  }

}

export interface GameSnapshot {
  id: number;
  creatorId: number;
  maxPlayers: number;
  status: GameStatus;
  phase: GamePhase | null;
  currentPlayerId: PlayerId | null;
  turnNumber: number;
  placingTurnsCompleted: number;
  board: BoardSnapshot;
  players: Player[];
  version: number;
  winnerId: PlayerId | null;
  winReason: string | null;
  lastMovedWorkerId: number | null;
  lastMovedWorkerPosition: { x: number; y: number } | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}
