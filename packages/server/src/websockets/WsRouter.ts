import { ClientMessage, GameMove, WS_MESSAGE_TYPES } from "../../../shared/src/websocket-types.ts";
import { Connection } from "../game/infra/Connection.ts";
import { ConnectionManager } from "../game/infra/ConnectionManager.ts";
import { GameService } from "../game/application/GameService.ts";
import { LobbyService } from "../game/application/LobbyService.ts";
import logger from "../logger.ts";
import { sendError } from "./utils.ts";

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
    private connectionManager: ConnectionManager,
  ) {}

  async handleMessage(connection: Connection, raw: string): Promise<void> {
    const { user } = connection;

    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      sendError(connection, "Invalid message format");
      return;
    }

    const { type, payload } = message;
    logger.info(`[WS] ${type} from ${user.username}`);

    try {
      await this.route(connection, user.id, type, payload);
    } catch (error) {
      logger.error(`[WS] Error handling ${type}:`, error);
      sendError(connection, error instanceof Error ? error.message : "Request failed");
    }
  }

  async handleDisconnect(connection: Connection): Promise<void> {
    const { user } = connection;

    logger.info(`[WS] Disconnect: ${user.username}`);
    const disconnects = this.connectionManager.removeConnection(connection);

    for (const { gameId, userId, wasLastConnection } of disconnects) {
      if (wasLastConnection) {
        await this.handlePlayerDisconnect(gameId, userId);
      }
    }
  }

  private async route(
    connection: Connection,
    userId: number,
    type: string,
    payload: Record<string, unknown> | undefined,
  ): Promise<void> {
    const gameId: unknown = payload?.gameId;

    switch (type) {
      // Lobby
      case WS_MESSAGE_TYPES.CREATE_GAME:
        return this.createGame(connection, userId, payload?.maxPlayers as number | undefined);

      case WS_MESSAGE_TYPES.JOIN_GAME:
        this.requireGameId(gameId);
        return this.joinGame(connection, userId, gameId);

      case WS_MESSAGE_TYPES.LIST_GAMES:
        return this.listGames(connection);

      case WS_MESSAGE_TYPES.LEAVE_GAME:
        this.requireGameId(gameId);
        return this.leaveGame(connection, userId, gameId);

      // Game
      case WS_MESSAGE_TYPES.SUBSCRIBE_GAME:
        this.requireGameId(gameId);
        if (this.connectionManager.gameOf(connection) !== undefined) {
          throw new Error("Already subscribed to a game; open a new connection for another game");
        }
        this.connectionManager.addClient(gameId, userId, connection);
        return this.getGameState(connection, userId, gameId);

      case WS_MESSAGE_TYPES.SET_READY:
        this.requireGameId(gameId);
        return this.setReady(connection, userId, gameId, payload?.isReady as boolean);

      case WS_MESSAGE_TYPES.MAKE_MOVE:
        this.requireGameId(gameId);
        return this.makeMove(connection, userId, gameId, payload?.move as GameMove);

      default:
        sendError(connection, `Unknown message type: ${type}`);
    }
  }

  private requireGameId(gameId: unknown): asserts gameId is number {
    if (!Number.isInteger(gameId) || (gameId as number) < 1) throw new Error("Game ID must be a positive whole number");
  }

  private async createGame(connection: Connection, userId: number, maxPlayers = 2): Promise<void> {
    const game = await this.lobbyService.createGame(userId, maxPlayers);
    await this.gameService.addPlayer(game.id, userId);

    const gameView = await this.gameService.getGameStateForPlayer(game.id, userId);
    connection.send({ type: WS_MESSAGE_TYPES.GAME_CREATED, payload: { gameId: game.id, gameState: gameView } });

    logger.info(`Game ${game.id} created by user ${userId}`);
  }

  private async joinGame(connection: Connection, userId: number, gameId: number): Promise<void> {
    const { game, isNewPlayer } = await this.addPlayerIfNew(gameId, userId);

    const gameView = await this.gameService.getGameStateForPlayer(gameId, userId);
    connection.send({ type: WS_MESSAGE_TYPES.GAME_JOINED, payload: { gameId, gameState: gameView } });

    if (isNewPlayer) {
      await this.broadcastPlayerJoined(game, userId);
    }

    logger.info(`User ${userId} ${isNewPlayer ? "joined" : "reconnected to"} game ${gameId}`);
  }

  private async listGames(connection: Connection): Promise<void> {
    const games = await this.lobbyService.findAvailableGames();

    const gamesList = games.map((g) => ({
      id: g.id,
      status: g.status,
      playerCount: g.players.size,
      maxPlayers: g.maxPlayers,
      createdAt: g.createdAt,
    }));

    connection.send({ type: WS_MESSAGE_TYPES.GAMES_LIST, payload: { games: gamesList } });
  }

  private async leaveGame(connection: Connection, userId: number, gameId: number): Promise<void> {
    const { game } = await this.gameService.removePlayer(gameId, userId);
    connection.send({ type: WS_MESSAGE_TYPES.GAME_LEFT, payload: { gameId } });

    this.connectionManager.broadcastToGame(gameId, {
      type: WS_MESSAGE_TYPES.PLAYER_LEFT,
      payload: { gameId, userId, playerCount: game.players.size, maxPlayers: game.maxPlayers },
    });

    logger.info(`User ${userId} left game ${gameId}`);
  }

  private async handlePlayerDisconnect(gameId: number, userId: number): Promise<void> {
    logger.info(`User ${userId} lost last connection to game ${gameId}`);

    try {
      const { game } = await this.gameService.removePlayer(gameId, userId);

      this.connectionManager.broadcastToGame(gameId, {
        type: WS_MESSAGE_TYPES.PLAYER_LEFT,
        payload: { gameId, userId, playerCount: game.players.size, maxPlayers: game.maxPlayers },
      });

      logger.info(`Player ${userId} auto-removed from game ${gameId}`);
    } catch {
      logger.debug(`Player ${userId} not auto-removed from game ${gameId}`);
    }
  }

  private async getGameState(connection: Connection, userId: number, gameId: number): Promise<void> {
    const [gameView, game] = await Promise.all([
      this.gameService.getGameStateForPlayer(gameId, userId),
      this.gameService.getGame(gameId),
    ]);

    connection.send({
      type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
      payload: {
        gameId,
        version: game?.version ?? 0,
        state: gameView,
      },
    });
  }

  private async setReady(connection: Connection, userId: number, gameId: number, ready: boolean): Promise<void> {
    const { game } = await this.gameService.setPlayerReady(gameId, userId, ready);

    connection.send({
      type: WS_MESSAGE_TYPES.READY_STATUS_UPDATE,
      payload: {
        ready,
        allReady: game.areAllPlayersReady(),
        gameStarted: game.status === "in-progress",
      },
    });

    logger.info(`Ready status: user ${userId} in game ${gameId} = ${ready}`);
  }

  private async makeMove(connection: Connection, userId: number, gameId: number, move: GameMove): Promise<void> {
    const result = await this.gameService.applyMove(gameId, userId, move);

    connection.send({
      type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
      payload: {
        gameId,
        version: result.game.version,
        state: result.view,
      },
    });

    logger.info(`Move processed for user ${userId} in game ${gameId}`);
  }

  private async addPlayerIfNew(gameId: number, userId: number) {
    try {
      const result = await this.gameService.addPlayer(gameId, userId);
      return { game: result.game, isNewPlayer: true };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("already in game")) {
        const game = await this.gameService.getGame(gameId);
        if (!game) throw error;
        return { game, isNewPlayer: false };
      }
      throw error;
    }
  }

  private async broadcastPlayerJoined(
    game: { id: number; version: number; maxPlayers: number; players: ReadonlyMap<number, { userId: number }> },
    joinedUserId: number,
  ): Promise<void> {
    const gameId = game.id;

    this.connectionManager.broadcastToGame(gameId, {
      type: WS_MESSAGE_TYPES.PLAYER_JOINED,
      payload: { gameId, userId: joinedUserId, playerCount: game.players.size, maxPlayers: game.maxPlayers },
    });

    for (const player of game.players.values()) {
      try {
        const playerView = await this.gameService.getGameStateForPlayer(gameId, player.userId);
        this.connectionManager.sendToPlayer(gameId, player.userId, {
          type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
          payload: { gameId, version: game.version, state: playerView },
        });
      } catch (err) {
        logger.error(`Failed to send state to player ${player.userId}:`, err);
      }
    }
  }
}
