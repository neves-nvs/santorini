import { GameMove, WS_MESSAGE_TYPES } from '../../../../shared/src/websocket-types';
import { send, sendError } from '../../websockets/utils';

import { AuthenticatedWebSocket } from '../../websockets/authenticatedWebsocket';
import { gameService } from '../../composition-root';
import logger from '../../logger';

interface MovePayload {
  gameId: number;
  move: GameMove;
}

interface GameIdPayload {
  gameId: number;
}

interface ReadyPayload {
  gameId: number;
  ready: boolean;
}

/**
 * WebSocket controller for game-related operations
 * Handles real-time game interactions and state updates
 */
export class GameWsController {
  private gameService = gameService;

  /**
   * Handle player move
   */
  async handleMove(ws: AuthenticatedWebSocket, userId: number, payload: MovePayload): Promise<void> {
    try {
      const { gameId, move } = payload;
      
      if (!gameId || !move) {
        sendError(ws, 'Missing gameId or move data');
        return;
      }

      logger.info(`Processing move for user ${userId} in game ${gameId}:`, move);

      const result = await this.gameService.applyMove(gameId, userId, move);

      // Send updated state to the player (wrapped in state field for consistency)
      send(ws, WS_MESSAGE_TYPES.GAME_STATE_UPDATE, {
        gameId,
        version: result.game.version,
        state: result.view
      });

      // Note: GameBroadcaster also sends updates to other players

      logger.info(`Move processed successfully for user ${userId} in game ${gameId}`);
    } catch (error) {
      logger.error(`Error processing move for user ${userId}:`, error);
      sendError(ws, error instanceof Error ? error.message : 'Failed to process move');
    }
  }

  /**
   * Handle game state request
   */
  async handleGetGameState(ws: AuthenticatedWebSocket, userId: number, payload: GameIdPayload): Promise<void> {
    try {
      const { gameId } = payload;

      if (!gameId) {
        sendError(ws, 'Missing gameId');
        return;
      }

      logger.info(`Getting game state for user ${userId} in game ${gameId}`);

      const gameView = await this.gameService.getGameStateForPlayer(gameId, userId);
      const game = await this.gameService.getGame(gameId);

      send(ws, WS_MESSAGE_TYPES.GAME_STATE_UPDATE, {
        gameId,
        version: game?.version ?? 0,
        state: gameView
      });

      logger.info(`Game state sent to user ${userId} for game ${gameId}`);
    } catch (error) {
      logger.error(`Error getting game state for user ${userId}:`, error);
      sendError(ws, error instanceof Error ? error.message : 'Failed to get game state');
    }
  }

  /**
   * Handle player ready status.
   * When all players confirm ready, game auto-starts.
   *
   * Flow:
   * 1. Players join a game via WebSocket connection
   * 2. Each player must confirm/accept the game (to verify opponents)
   * 3. Once ALL players have confirmed, the game auto-starts
   */
  async handlePlayerReady(ws: AuthenticatedWebSocket, userId: number, payload: ReadyPayload): Promise<void> {
    try {
      const { gameId, ready } = payload;

      if (!gameId || typeof ready !== 'boolean') {
        sendError(ws, 'Missing gameId or ready status');
        return;
      }

      logger.info(`Setting ready status for user ${userId} in game ${gameId}: ${ready}`);

      const { game } = await this.gameService.setPlayerReady(gameId, userId, ready);

      // Send ready status update to the player
      send(ws, WS_MESSAGE_TYPES.READY_STATUS_UPDATE, {
        ready,
        allReady: game.areAllPlayersReady(),
        gameStarted: game.status === 'in-progress'
      });

      logger.info(`Ready status updated for user ${userId} in game ${gameId}`);
    } catch (error) {
      logger.error(`Error updating ready status for user ${userId}:`, error);
      sendError(ws, error instanceof Error ? error.message : 'Failed to update ready status');
    }
  }

  /**
   * Handle game start request
   */
  async handleStartGame(ws: AuthenticatedWebSocket, userId: number, payload: GameIdPayload): Promise<void> {
    const { gameId } = payload;

    if (!gameId) {
      sendError(ws, 'Missing gameId');
      return;
    }

    try {
      logger.info(`Starting game ${gameId} requested by user ${userId}`);

      await this.gameService.startGame(gameId);

      // Note: GameService.startGame already broadcasts to all players via GameBroadcaster
      // No additional message needed here

      logger.info(`Game ${gameId} started successfully`);
    } catch (error) {
      logger.error(`Error starting game ${gameId}:`, error);
      sendError(ws, error instanceof Error ? error.message : 'Failed to start game');
    }
  }
}
