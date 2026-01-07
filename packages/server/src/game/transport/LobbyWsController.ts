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
   * Idempotent - if player already in game, just sends current state.
   */
  async handleJoinGame(ws: AuthenticatedWebSocket, userId: number, payload: GameIdPayload): Promise<void> {
    try {
      const { gameId } = payload;

      if (!gameId) {
        sendError(ws, 'Missing gameId');
        return;
      }

      logger.info(`User ${userId} joining game ${gameId}`);

      let game;
      let isNewPlayer = false;

      try {
        // Try to add player to game
        const result = await this.gameService.addPlayer(gameId, userId);
        game = result.game;
        isNewPlayer = true;
      } catch (error: any) {
        // If player already in game, just get the game state
        if (error.message?.includes('already in game')) {
          logger.info(`User ${userId} already in game ${gameId}, sending current state`);
          const gameState = await this.gameService.getGame(gameId);
          if (!gameState) {
            throw error; // Re-throw if game not found
          }
          game = gameState;
        } else {
          throw error; // Re-throw other errors
        }
      }

      // Send game state to player
      const gameView = await this.gameService.getGameStateForPlayer(gameId, userId);
      send(ws, WS_MESSAGE_TYPES.GAME_JOINED, {
        gameId,
        gameState: gameView
      });

      // Only broadcast if this is a new player joining
      if (isNewPlayer) {
        // Broadcast player_joined event
        this.wsConnectionManager.broadcastToGame(gameId, {
          type: WS_MESSAGE_TYPES.PLAYER_JOINED,
          payload: {
            gameId,
            userId,
            playerCount: game.players.size,
            maxPlayers: game.maxPlayers
          }
        });

        // Broadcast full game state to ALL players so UIs update
        for (const player of game.players.values()) {
          try {
            const playerView = await this.gameService.getGameStateForPlayer(gameId, player.userId);
            this.wsConnectionManager.sendToPlayer(gameId, player.userId, {
              type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
              payload: {
                gameId,
                version: game.version,
                state: playerView
              }
            });
          } catch (err) {
            logger.error(`Failed to send state to player ${player.userId}:`, err);
          }
        }
      }

      logger.info(`User ${userId} ${isNewPlayer ? 'joined' : 'reconnected to'} game ${gameId} successfully`);
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
