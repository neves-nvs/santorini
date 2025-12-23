import { gameService, lobbyService } from '../../composition-root';
import { send, sendError } from '../../websockets/utils';

import { AuthenticatedWebSocket } from '../../websockets/authenticatedWebsocket';
import { WS_MESSAGE_TYPES } from '../../../../shared/src/websocket-types';
import logger from '../../logger';
import { webSocketConnectionManager } from '../infra/WebSocketConnectionManager';

interface CreateGamePayload {
  maxPlayers?: number;
}

interface GameIdPayload {
  gameId: number;
}

/**
 * WebSocket controller for lobby operations
 * Handles game creation, joining, and lobby browsing
 */
export class LobbyWsController {
  private lobbyService = lobbyService;
  private gameService = gameService;
  private wsConnectionManager = webSocketConnectionManager;

  /**
   * Handle create game request
   */
  async handleCreateGame(ws: AuthenticatedWebSocket, userId: number, payload: CreateGamePayload): Promise<void> {
    try {
      const { maxPlayers = 2 } = payload || {};

      logger.info(`Creating game for user ${userId}, max players: ${maxPlayers}`);

      const game = await this.lobbyService.createGame(userId, maxPlayers);
      
      // Add creator as first player
      await this.gameService.addPlayer(game.id, userId);

      // Send game state to creator
      const gameView = await this.gameService.getGameStateForPlayer(game.id, userId);
      send(ws, WS_MESSAGE_TYPES.GAME_CREATED, {
        gameId: game.id,
        gameState: gameView
      });

      logger.info(`Game ${game.id} created successfully for user ${userId}`);
    } catch (error) {
      logger.error(`Error creating game for user ${userId}:`, error);
      sendError(ws, error instanceof Error ? error.message : 'Failed to create game');
    }
  }

  /**
   * Handle join game request.
   * Adds player to game roster and broadcasts to existing subscribers.
   */
  async handleJoinGame(ws: AuthenticatedWebSocket, userId: number, payload: GameIdPayload): Promise<void> {
    try {
      const { gameId } = payload;

      if (!gameId) {
        sendError(ws, 'Missing gameId');
        return;
      }

      logger.info(`User ${userId} joining game ${gameId}`);

      // Add player to game
      const { game } = await this.gameService.addPlayer(gameId, userId);

      // Send game state to new player
      const gameView = await this.gameService.getGameStateForPlayer(gameId, userId);
      send(ws, WS_MESSAGE_TYPES.GAME_JOINED, {
        gameId,
        gameState: gameView
      });

      // Broadcast to other subscribed players that someone joined
      this.wsConnectionManager.broadcastToGame(gameId, {
        type: WS_MESSAGE_TYPES.PLAYER_JOINED,
        payload: {
          gameId,
          userId,
          playerCount: game.players.size,
          maxPlayers: game.maxPlayers
        }
      });

      logger.info(`User ${userId} joined game ${gameId} successfully`);
    } catch (error) {
      logger.error(`Error joining game for user ${userId}:`, error);
      sendError(ws, error instanceof Error ? error.message : 'Failed to join game');
    }
  }

  /**
   * Handle list available games request
   */
  async handleListGames(ws: AuthenticatedWebSocket, userId: number): Promise<void> {
    try {
      logger.info(`Listing available games for user ${userId}`);

      const games = await this.lobbyService.findAvailableGames();

      // Convert to simple view for lobby
      const gamesList = games.map(game => ({
        id: game.id,
        status: game.status,
        playerCount: game.players.size,
        maxPlayers: game.maxPlayers,
        createdAt: game.createdAt
      }));

      send(ws, WS_MESSAGE_TYPES.GAMES_LIST, { games: gamesList });

      logger.info(`Sent ${games.length} available games to user ${userId}`);
    } catch (error) {
      logger.error(`Error listing games for user ${userId}:`, error);
      sendError(ws, error instanceof Error ? error.message : 'Failed to list games');
    }
  }

  /**
   * Handle leave game request
   */
  async handleLeaveGame(ws: AuthenticatedWebSocket, userId: number, payload: GameIdPayload): Promise<void> {
    try {
      const { gameId } = payload;
      
      if (!gameId) {
        sendError(ws, 'Missing gameId');
        return;
      }

      logger.info(`User ${userId} leaving game ${gameId}`);

      // TODO: Implement leave game logic in domain/application layer
      // For now, just acknowledge
      send(ws, WS_MESSAGE_TYPES.GAME_LEFT, { gameId });

      logger.info(`User ${userId} left game ${gameId}`);
    } catch (error) {
      logger.error(`Error leaving game for user ${userId}:`, error);
      sendError(ws, error instanceof Error ? error.message : 'Failed to leave game');
    }
  }
}
