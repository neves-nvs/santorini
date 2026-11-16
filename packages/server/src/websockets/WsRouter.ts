import { GameError, PlayerAlreadyInGameError, isRefusal, toWireError } from "@/errors/GameErrors.ts";
import {
  MoveCommand,
  ParsedClientMessage,
  WS_MESSAGE_TYPES,
  clientMessageSchema,
  requestIdSchema,
} from "@santorini/shared";
import { describeInvalidMessage, replyError } from "./utils.ts";
import { Connection } from "@/game/infra/Connection.ts";
import { ConnectionManager } from "@/game/infra/ConnectionManager.ts";
import { GameService } from "@/game/application/GameService.ts";
import logger from "@/logger.ts";
import { sanitizeForLog } from "@/logSanitizer.ts";

type CommandResult = { gameId: number } | Record<string, never>;

/**
 * WebSocket message router.
 * Routes incoming commands to the services, answers each with exactly one `ok` or `error` carrying the request id,
 * and manages the connection lifecycle.
 *
 * Equivalent to HTTP router + controller combined, since WebSocket
 * doesn't have a framework-provided routing layer.
 */
export class WsRouter {
  constructor(
    private gameService: GameService,
    private connectionManager: ConnectionManager,
  ) {}

  async handleMessage(connection: Connection, raw: string): Promise<void> {
    const { user } = connection;

    let frame: unknown;
    try {
      frame = JSON.parse(raw);
    } catch {
      replyError(connection, undefined, { code: "invalid_message", message: "Invalid message format" });
      return;
    }
    if (typeof frame !== "object" || frame === null || Array.isArray(frame)) {
      replyError(connection, undefined, { code: "invalid_message", message: "Invalid message format" });
      return;
    }

    const { type, id: rawId } = frame as { type?: unknown; id?: unknown };
    const id = requestIdSchema.safeParse(rawId).data;
    logger.info(`[WS] ${sanitizeForLog(type)} from ${user.username}`);

    const parsed = clientMessageSchema.safeParse(frame);
    if (!parsed.success) {
      replyError(connection, id, describeInvalidMessage(type, parsed.error));
      return;
    }

    try {
      const result = await this.route(connection, user.id, parsed.data);
      connection.send({ type: WS_MESSAGE_TYPES.OK, id, payload: result });
    } catch (error) {
      if (isRefusal(error)) {
        logger.info(`[WS] ${parsed.data.type} refused: ${(error as Error).message}`);
      } else {
        logger.error(`[WS] Error handling ${parsed.data.type}:`, error);
      }
      replyError(connection, id, toWireError(error));
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

  private async route(connection: Connection, userId: number, message: ParsedClientMessage): Promise<CommandResult> {
    const { gameId } = message.payload;

    switch (message.type) {
      case "join_game":
        await this.joinGame(userId, gameId);
        return { gameId };

      case "leave_game":
        await this.leaveGame(userId, gameId);
        return { gameId };

      case "subscribe_game":
        if (this.connectionManager.gameOf(connection) !== undefined) {
          throw new GameError(
            "Already subscribed to a game; open a new connection for another game",
            undefined,
            "invalid_game_state",
          );
        }
        this.connectionManager.addClient(gameId, userId, connection);
        await this.sendGameState(connection, userId, gameId);
        return { gameId };

      case "set_ready":
        await this.setReady(userId, gameId, message.payload.isReady);
        return {};

      case "make_move":
        await this.makeMove(userId, gameId, message.payload.move);
        return {};
    }
  }

  private async joinGame(userId: number, gameId: number): Promise<void> {
    const { game, isNewPlayer } = await this.addPlayerIfNew(gameId, userId);

    if (isNewPlayer) {
      await this.broadcastPlayerJoined(game, userId);
    }

    logger.info(`User ${userId} ${isNewPlayer ? "joined" : "reconnected to"} game ${gameId}`);
  }

  private async leaveGame(userId: number, gameId: number): Promise<void> {
    const { game } = await this.gameService.removePlayer(gameId, userId);

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

  private async sendGameState(connection: Connection, userId: number, gameId: number): Promise<void> {
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

  private async setReady(userId: number, gameId: number, ready: boolean): Promise<void> {
    await this.gameService.setPlayerReady(gameId, userId, ready);

    logger.info(`Ready status: user ${userId} in game ${gameId} = ${ready}`);
  }

  private async makeMove(userId: number, gameId: number, move: MoveCommand): Promise<void> {
    await this.gameService.applyMove(gameId, userId, move);

    logger.info(`Move processed for user ${userId} in game ${gameId}`);
  }

  private async addPlayerIfNew(gameId: number, userId: number) {
    try {
      const result = await this.gameService.addPlayer(gameId, userId);
      return { game: result.game, isNewPlayer: true };
    } catch (error: unknown) {
      if (error instanceof PlayerAlreadyInGameError) {
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
