import { ClientMessage, GameMove, WS_MESSAGE_TYPES } from '../../../shared/src/websocket-types';
import { send, sendError } from './utils';

import { AuthenticatedWebSocket } from './authenticatedWebsocket';
import { GameService } from '../game/application/GameService';
import { LobbyService } from '../game/application/LobbyService';
import { WebSocketConnectionManager } from '../game/infra/WebSocketConnectionManager';
import logger from '../logger';

/**
 * WebSocket message router.
 * Routes incoming messages to appropriate handlers and manages connection lifecycle.
 *
 * Equivalent to HTTP router + controller combined, since WebSocket
 * doesn't have a framework-provided routing layer.
 */
export class WsRouter {
  constructor(
    private gameService: GameService,
    private lobbyService: LobbyService,
    private connectionManager: WebSocketConnectionManager
  ) {}

  async handleMessage(ws: AuthenticatedWebSocket, raw: string): Promise<void> {
    const user = ws.user;
    if (!user) {
      sendError(ws, 'Not authenticated');
      return;
    }

    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      sendError(ws, 'Invalid message format');
      return;
    }

    const { type, payload } = message;
    logger.info(`[WS] ${type} from ${user.username}`);

    try {
      await this.route(ws, user.id, type, payload);
    } catch (error) {
      logger.error(`[WS] Error handling ${type}:`, error);
      sendError(ws, error instanceof Error ? error.message : 'Request failed');
    }
  }

  async handleDisconnect(ws: AuthenticatedWebSocket): Promise<void> {
    const user = ws.user;
    if (!user) return;

    logger.info(`[WS] Disconnect: ${user.username}`);
    const disconnects = this.connectionManager.removeConnection(ws);

    for (const { gameId, userId, wasLastConnection } of disconnects) {
      if (wasLastConnection) {
        await this.handlePlayerDisconnect(gameId, userId);
      }
    }
  }

  private async route(
    ws: AuthenticatedWebSocket,
    userId: number,
    type: string,
    payload: Record<string, unknown> | undefined
  ): Promise<void> {
    const gameId = payload?.gameId as number | undefined;

    switch (type) {
      // Lobby
      case WS_MESSAGE_TYPES.CREATE_GAME:
        return this.createGame(ws, userId, payload?.maxPlayers as number | undefined);

      case WS_MESSAGE_TYPES.JOIN_GAME:
        this.requireGameId(gameId);
        this.connectionManager.addClient(gameId, userId, ws);
        return this.joinGame(ws, userId, gameId);

      case WS_MESSAGE_TYPES.LIST_GAMES:
        return this.listGames(ws);

      case WS_MESSAGE_TYPES.LEAVE_GAME:
        this.requireGameId(gameId);
        return this.leaveGame(ws, userId, gameId);

      // Game
      case WS_MESSAGE_TYPES.SUBSCRIBE_GAME:
        this.requireGameId(gameId);
        this.connectionManager.addClient(gameId, userId, ws);
        return this.getGameState(ws, userId, gameId);

      case WS_MESSAGE_TYPES.SET_READY:
        this.requireGameId(gameId);
        return this.setReady(ws, userId, gameId, payload?.isReady as boolean);

      case WS_MESSAGE_TYPES.MAKE_MOVE:
        this.requireGameId(gameId);
        return this.makeMove(ws, userId, gameId, payload?.move as GameMove);

      default:
        sendError(ws, `Unknown message type: ${type}`);
    }
  }

  private requireGameId(gameId: number | undefined): asserts gameId is number {
    if (!gameId) throw new Error('Game ID required');
  }

  private async createGame(ws: AuthenticatedWebSocket, userId: number, maxPlayers = 2): Promise<void> {
    const game = await this.lobbyService.createGame(userId, maxPlayers);
    await this.gameService.addPlayer(game.id, userId);

    const gameView = await this.gameService.getGameStateForPlayer(game.id, userId);
    send(ws, WS_MESSAGE_TYPES.GAME_CREATED, { gameId: game.id, gameState: gameView });

    logger.info(`Game ${game.id} created by user ${userId}`);
  }

  private async joinGame(ws: AuthenticatedWebSocket, userId: number, gameId: number): Promise<void> {
    const { game, isNewPlayer } = await this.addPlayerIfNew(gameId, userId);

    const gameView = await this.gameService.getGameStateForPlayer(gameId, userId);
    send(ws, WS_MESSAGE_TYPES.GAME_JOINED, { gameId, gameState: gameView });

    if (isNewPlayer) {
      await this.broadcastPlayerJoined(game, userId);
    }

    logger.info(`User ${userId} ${isNewPlayer ? 'joined' : 'reconnected to'} game ${gameId}`);
  }

  private async listGames(ws: AuthenticatedWebSocket): Promise<void> {
    const games = await this.lobbyService.findAvailableGames();

    const gamesList = games.map(g => ({
      id: g.id,
      status: g.status,
      playerCount: g.players.size,
      maxPlayers: g.maxPlayers,
      createdAt: g.createdAt
    }));

    send(ws, WS_MESSAGE_TYPES.GAMES_LIST, { games: gamesList });
  }

  private async leaveGame(ws: AuthenticatedWebSocket, userId: number, gameId: number): Promise<void> {
    const { game } = await this.gameService.removePlayer(gameId, userId);
    send(ws, WS_MESSAGE_TYPES.GAME_LEFT, { gameId });

    this.connectionManager.broadcastToGame(gameId, {
      type: WS_MESSAGE_TYPES.PLAYER_LEFT,
      payload: { gameId, userId, playerCount: game.players.size, maxPlayers: game.maxPlayers }
    });

    logger.info(`User ${userId} left game ${gameId}`);
  }

  private async handlePlayerDisconnect(gameId: number, userId: number): Promise<void> {
    logger.info(`User ${userId} lost last connection to game ${gameId}`);

    try {
      const { game } = await this.gameService.removePlayer(gameId, userId);

      this.connectionManager.broadcastToGame(gameId, {
        type: WS_MESSAGE_TYPES.PLAYER_LEFT,
        payload: { gameId, userId, playerCount: game.players.size, maxPlayers: game.maxPlayers }
      });

      logger.info(`Player ${userId} auto-removed from game ${gameId}`);
    } catch {
      logger.debug(`Player ${userId} not auto-removed from game ${gameId}`);
    }
  }

  private async getGameState(ws: AuthenticatedWebSocket, userId: number, gameId: number): Promise<void> {
    const [gameView, game] = await Promise.all([
      this.gameService.getGameStateForPlayer(gameId, userId),
      this.gameService.getGame(gameId)
    ]);

    send(ws, WS_MESSAGE_TYPES.GAME_STATE_UPDATE, {
      gameId,
      version: game?.version ?? 0,
      state: gameView
    });
  }

  private async setReady(ws: AuthenticatedWebSocket, userId: number, gameId: number, ready: boolean): Promise<void> {
    const { game } = await this.gameService.setPlayerReady(gameId, userId, ready);

    send(ws, WS_MESSAGE_TYPES.READY_STATUS_UPDATE, {
      ready,
      allReady: game.areAllPlayersReady(),
      gameStarted: game.status === 'in-progress'
    });

    logger.info(`Ready status: user ${userId} in game ${gameId} = ${ready}`);
  }

  private async makeMove(ws: AuthenticatedWebSocket, userId: number, gameId: number, move: GameMove): Promise<void> {
    const result = await this.gameService.applyMove(gameId, userId, move);

    send(ws, WS_MESSAGE_TYPES.GAME_STATE_UPDATE, {
      gameId,
      version: result.game.version,
      state: result.view
    });

    logger.info(`Move processed for user ${userId} in game ${gameId}`);
  }

  private async addPlayerIfNew(gameId: number, userId: number) {
    try {
      const result = await this.gameService.addPlayer(gameId, userId);
      return { game: result.game, isNewPlayer: true };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('already in game')) {
        const game = await this.gameService.getGame(gameId);
        if (!game) throw error;
        return { game, isNewPlayer: false };
      }
      throw error;
    }
  }

  private async broadcastPlayerJoined(game: { id: number; version: number; maxPlayers: number; players: ReadonlyMap<number, { userId: number }> }, joinedUserId: number): Promise<void> {
    const gameId = game.id;

    this.connectionManager.broadcastToGame(gameId, {
      type: WS_MESSAGE_TYPES.PLAYER_JOINED,
      payload: { gameId, userId: joinedUserId, playerCount: game.players.size, maxPlayers: game.maxPlayers }
    });

    for (const player of game.players.values()) {
      try {
        const playerView = await this.gameService.getGameStateForPlayer(gameId, player.userId);
        this.connectionManager.sendToPlayer(gameId, player.userId, {
          type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
          payload: { gameId, version: game.version, state: playerView }
        });
      } catch (err) {
        logger.error(`Failed to send state to player ${player.userId}:`, err);
      }
    }
  }
}

