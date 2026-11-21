import { UserId } from "./types.ts";

/**
 * Player Domain Entity
 *
 * Represents a player within a game context.
 * Links to the User entity but contains game-specific state.
 */

export class Player {
  constructor(
    public readonly userId: UserId,
    private _isReady: boolean = false,
  ) {}

  get isReady(): boolean {
    return this._isReady;
  }

  setReady(ready: boolean): void {
    this._isReady = ready;
  }
}
