import { GameRuleError, GameSetup, UserId } from "@santorini/engine";

export interface LobbyPlayer {
  readonly userId: UserId;
  readonly isReady: boolean;
}

/**
 * The seats of a game that has not started. A seat is the position in the list of players, so a player who leaves
 * closes the gap. Players can only be ready while every seat is taken, and a player who leaves clears every ready,
 * so a ready always means "ready to play with exactly these players in these seats".
 */
export class Lobby {
  constructor(
    public readonly id: number,
    public readonly creatorId: UserId,
    public readonly maxPlayers: number,
    private _players: readonly LobbyPlayer[],
  ) {}

  get players(): readonly LobbyPlayer[] {
    return this._players;
  }

  get isFull(): boolean {
    return this._players.length === this.maxPlayers;
  }

  join(userId: UserId): void {
    if (this.isFull) {
      throw new GameRuleError("The lobby is full", "game_full");
    }
    if (this.seatOf(userId) !== -1) {
      throw new GameRuleError("Already in the lobby");
    }

    this._players = [...this._players, { userId, isReady: false }];
  }

  leave(userId: UserId): void {
    this.requireMember(userId);

    this._players = this._players
      .filter((player) => player.userId !== userId)
      .map(({ userId }) => ({ userId, isReady: false }));
  }

  setReady(userId: UserId, isReady: boolean): void {
    this.requireMember(userId);
    if (isReady && !this.isFull) {
      throw new GameRuleError("Every seat must be taken before anyone is ready");
    }

    this._players = this._players.map((player) => (player.userId === userId ? { userId, isReady } : player));
  }

  start(): GameSetup {
    if (!this.isFull || !this._players.every((player) => player.isReady)) {
      throw new GameRuleError("The game starts when every seat is taken and every player is ready");
    }

    return { creatorId: this.creatorId, players: this._players.map((player) => player.userId) };
  }

  private seatOf(userId: UserId): number {
    return this._players.findIndex((player) => player.userId === userId);
  }

  private requireMember(userId: UserId): void {
    if (this.seatOf(userId) === -1) {
      throw new GameRuleError("Not in the lobby", "not_in_game");
    }
  }
}
