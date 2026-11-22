import { Game, GameId, UserId } from "@santorini/engine";
import { WS_MESSAGE_TYPES } from "@santorini/shared";

import { ConnectionManager } from "@/game/infra/ConnectionManager.ts";
import logger from "@/logger.ts";

import { GameViewBuilder } from "./GameViewBuilder.ts";

/**
 * Application service that publishes a game to the sockets subscribed to it.
 * Every change to a game goes out through here, so a player and a watcher alike see it.
 */
export class GameBroadcaster {
  constructor(
    private gameViewBuilder: GameViewBuilder = new GameViewBuilder(),
    private connectionManager: ConnectionManager = new ConnectionManager(),
  ) {}

  /** Build a view with live connection presence for a player. */
  buildView(game: Game, userId: UserId) {
    return this.gameViewBuilder.buildFor(game, userId, this.connectedUsers(game.id));
  }

  connectedUsers(gameId: GameId): Set<UserId> {
    return this.connectionManager.connectedUsers(gameId);
  }

  /**
   * Send every subscribed socket the game as its user sees it
   */
  broadcastGameUpdate(game: Game): void {
    for (const { connection, userId } of this.connectionManager.subscribers(game.id)) {
      try {
        connection.send({ type: WS_MESSAGE_TYPES.GAME_STATE, payload: this.buildView(game, userId) });
      } catch (error) {
        logger.error(`Failed to send game ${game.id} to user ${userId}:`, error);
      }
    }
  }

  /** Refresh presence for subscribers when a socket joins or leaves without changing the game. */
  broadcastPresence(gameId: GameId, game: Game): void {
    if (game.id === gameId) this.broadcastGameUpdate(game);
  }
}
