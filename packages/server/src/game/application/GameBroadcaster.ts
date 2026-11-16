import { ConnectionManager } from "@/game/infra/ConnectionManager.ts";
import { Game } from "@santorini/engine/Game";
import { GameEvent } from "@santorini/engine/GameEvent";
import { GameViewBuilder } from "./GameViewBuilder.ts";
import { WS_MESSAGE_TYPES } from "@santorini/shared";
import logger from "@/logger.ts";

/**
 * Application service responsible for broadcasting game updates to players
 * Handles event-driven broadcasting after domain operations
 */
export class GameBroadcaster {
  constructor(
    private gameViewBuilder: GameViewBuilder = new GameViewBuilder(),
    private connectionManager: ConnectionManager = new ConnectionManager(),
  ) {}

  /**
   * Broadcast game update to all players in the game
   * Each player receives their personalized view of the game state
   * The current player also receives their available moves
   */
  async broadcastGameUpdate(game: Game, events: GameEvent[]): Promise<void> {
    logger.info(`Broadcasting game update for game ${game.id} to all players`);

    // Get available moves for the current player (if game is in progress)
    const availableMoves = game.status === "in-progress" ? game.getAvailableMoves() : [];

    // Send personalized game state to each player in the game
    for (const player of game.players.values()) {
      try {
        // Only pass availableMoves to the current player
        const isCurrentPlayer = game.currentPlayerId === player.id;
        const playerMoves = isCurrentPlayer ? availableMoves : undefined;
        const view = this.gameViewBuilder.buildForPlayer(game, player.userId, playerMoves);

        this.connectionManager.sendToPlayer(game.id, player.userId, {
          type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
          payload: {
            gameId: game.id,
            version: game.version,
            state: view,
          },
        });

        logger.debug(
          `Sent game state to player ${player.userId} for game ${game.id}, isCurrentPlayer: ${isCurrentPlayer}`,
        );
      } catch (error) {
        logger.error(`Failed to send game state to player ${player.userId}:`, error);
      }
    }

    // Log the events that triggered this broadcast
    if (events.length > 0) {
      logger.info(`Broadcast triggered by events: ${events.map((e) => e.type).join(", ")}`);
    }
  }
}
