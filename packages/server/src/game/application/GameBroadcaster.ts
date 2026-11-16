import { ConnectionManager } from "@/game/infra/ConnectionManager.ts";
import { Game } from "@santorini/engine";
import { GameViewBuilder } from "./GameViewBuilder.ts";
import { WS_MESSAGE_TYPES } from "@santorini/shared";
import logger from "@/logger.ts";

/**
 * Application service that publishes a game to the sockets subscribed to it.
 * Every change to a game goes out through here, so a player and a watcher alike see it.
 */
export class GameBroadcaster {
  constructor(
    private gameViewBuilder: GameViewBuilder = new GameViewBuilder(),
    private connectionManager: ConnectionManager = new ConnectionManager(),
  ) {}

  /**
   * Send every subscribed socket the game as its user sees it
   */
  broadcastGameUpdate(game: Game): void {
    for (const { connection, userId } of this.connectionManager.subscribers(game.id)) {
      try {
        connection.send({ type: WS_MESSAGE_TYPES.GAME_STATE, payload: this.gameViewBuilder.buildFor(game, userId) });
      } catch (error) {
        logger.error(`Failed to send game ${game.id} to user ${userId}:`, error);
      }
    }
  }
}
