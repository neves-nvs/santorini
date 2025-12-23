/**
 * Player Domain Entity
 * 
 * Represents a player within a game context.
 * Links to the User entity but contains game-specific state.
 */

export type PlayerId = number;
export type UserId = number;

export type PlayerStatus = 'active' | 'disconnected' | 'blocked' | 'eliminated';

export class Player {
  constructor(
    public readonly id: PlayerId,
    public readonly userId: UserId,
    public readonly seat: number,
    private _status: PlayerStatus = 'active',
    private _isReady: boolean = false
  ) {}

  get status(): PlayerStatus {
    return this._status;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  setReady(ready: boolean): void {
    this._isReady = ready;
  }

  setStatus(status: PlayerStatus): void {
    this._status = status;
  }

  isActive(): boolean {
    return this._status === 'active';
  }

  isEliminated(): boolean {
    return this._status === 'eliminated' || this._status === 'blocked';
  }
}
