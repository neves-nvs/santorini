import { Game, GameId, UserId } from "@santorini/engine";
import { WS_MESSAGE_TYPES } from "@santorini/shared";

import { ConnectionManager } from "@/game/infra/ConnectionManager.ts";
import logger from "@/logger.ts";

import { GameViewBuilder } from "./GameViewBuilder.ts";

export type PlayerUsernameLoader = (userIds: readonly UserId[]) => Promise<ReadonlyMap<UserId, string>>;

/**
 * Application service that publishes a game to the sockets subscribed to it.
 * Every change to a game goes out through here, so a player and a watcher alike see it.
 */
export class GameBroadcaster {
  constructor(
    private gameViewBuilder: GameViewBuilder,
    private connectionManager: ConnectionManager,
    private loadUsernames: PlayerUsernameLoader,
  ) {}

  /** Build a view with live connection presence for a player. */
  async buildView(game: Game, userId: UserId) {
    const usernames = await this.loadUsernames(game.players.map((player) => player.userId));
    return this.gameViewBuilder.buildFor(game, userId, this.connectedUsers(game.id), usernames);
  }

  connectedUsers(gameId: GameId): Set<UserId> {
    return this.connectionManager.connectedUsers(gameId);
  }

  /**
   * Send every subscribed socket the game as its user sees it
   */
  async broadcastGameUpdate(game: Game): Promise<void> {
    const subscribers = this.connectionManager.subscribers(game.id);
    if (subscribers.length === 0) return;

    const usernames = await this.loadUsernames(game.players.map((player) => player.userId));
    const connectedUsers = this.connectedUsers(game.id);

    for (const { connection, userId } of subscribers) {
      try {
        connection.send({
          type: WS_MESSAGE_TYPES.GAME_STATE,
          payload: this.gameViewBuilder.buildFor(game, userId, connectedUsers, usernames),
        });
      } catch (error) {
        logger.error(`Failed to send game ${game.id} to user ${userId}:`, error);
      }
    }
  }

  /** Refresh presence for subscribers when a socket joins or leaves without changing the game. */
  async broadcastPresence(gameId: GameId, game: Game): Promise<void> {
    if (game.id === gameId) await this.broadcastGameUpdate(game);
  }
}
