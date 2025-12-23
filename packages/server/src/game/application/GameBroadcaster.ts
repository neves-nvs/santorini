import { Game } from '../domain/Game';
import { GameEvent } from '../domain/GameEvent';
import { GameViewBuilder } from '../domain/GameViewBuilder';
import { Move } from '../domain/Move';
import { WS_MESSAGE_TYPES } from '../../../../shared/src/websocket-types';
import { WebSocketConnectionManager } from '../infra/WebSocketConnectionManager';
import logger from '../../logger';

/**
 * Application service responsible for broadcasting game updates to players
 * Handles event-driven broadcasting after domain operations
 */
export class GameBroadcaster {
  constructor(
    private gameViewBuilder: GameViewBuilder = new GameViewBuilder(),
    private wsConnectionManager: WebSocketConnectionManager = new WebSocketConnectionManager()
  ) {}

  /**
   * Broadcast game update to all players in the game
   * Each player receives their personalized view of the game state
   */
  async broadcastGameUpdate(game: Game, events: GameEvent[]): Promise<void> {
    logger.info(`Broadcasting game update for game ${game.id} to all players`);

    // Send personalized game state to each player in the game
    // We'll iterate through the players in the game and send to each
    for (const player of game.players.values()) {
      try {
        const view = this.gameViewBuilder.buildForPlayer(game, player.userId);

        this.wsConnectionManager.sendToPlayer(game.id, player.userId, {
          type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
          payload: {
            gameId: game.id,
            version: game.version,
            state: view
          }
        });

        logger.debug(`Sent game state to player ${player.userId} for game ${game.id}`);
      } catch (error) {
        logger.error(`Failed to send game state to player ${player.userId}:`, error);
      }
    }

    // Log the events that triggered this broadcast
    if (events.length > 0) {
      logger.info(`Broadcast triggered by events: ${events.map(e => e.type).join(', ')}`);
    }
  }

  /**
   * Broadcast game state with available moves to current player only
   */
  async broadcastGameStateWithMoves(game: Game, availableMoves: Move[]): Promise<void> {
    if (!game.currentPlayerId) {
      logger.warn(`No current player for game ${game.id}, skipping moves broadcast`);
      return;
    }

    logger.info(`Broadcasting available moves to current player ${game.currentPlayerId} in game ${game.id}`);

    try {
      const view = this.gameViewBuilder.buildForPlayer(game, game.currentPlayerId, availableMoves);
      
      this.wsConnectionManager.sendToPlayer(game.id, game.currentPlayerId, {
        type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
        payload: {
          gameId: game.id,
          version: game.version,
          state: view
        }
      });

      logger.debug(`Sent ${availableMoves.length} available moves to player ${game.currentPlayerId}`);
    } catch (error) {
      logger.error(`Failed to send available moves to player ${game.currentPlayerId}:`, error);
    }
  }

  /**
   * Broadcast game start notification to all players
   */
  async broadcastGameStart(game: Game): Promise<void> {
    logger.info(`Broadcasting game start for game ${game.id}`);

    this.wsConnectionManager.broadcastToGame(game.id, {
      type: WS_MESSAGE_TYPES.GAME_START,
      payload: {
        gameId: game.id,
        startedAt: game.startedAt,
        currentPlayerId: game.currentPlayerId
      }
    });
  }

  /**
   * Broadcast game completion to all players
   */
  async broadcastGameEnd(game: Game): Promise<void> {
    logger.info(`Broadcasting game end for game ${game.id}, winner: ${game.winnerId}`);

    this.wsConnectionManager.broadcastToGame(game.id, {
      type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
      payload: {
        gameId: game.id,
        version: game.version,
        status: game.status,
        winnerId: game.winnerId,
        winReason: game.winReason,
        finishedAt: game.finishedAt
      }
    });
  }
}
