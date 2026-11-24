import { GameId, UserId } from "@santorini/engine";
import {
  clientMessageSchema,
  MoveCommand,
  ParsedClientMessage,
  requestIdSchema,
  WS_MESSAGE_TYPES,
} from "@santorini/shared";

import { GameError, isRefusal, PlayerAlreadyInGameError, toWireError } from "@/errors/GameErrors.ts";
import { GameService } from "@/game/application/GameService.ts";
import { Connection } from "@/game/infra/Connection.ts";
import { ConnectionManager } from "@/game/infra/ConnectionManager.ts";
import { gameIdSchema } from "@/idSchemas.ts";
import logger from "@/logger.ts";
import { sanitizeForLog } from "@/logSanitizer.ts";

import { describeInvalidMessage, replyError } from "./utils.ts";

type CommandResult = { gameId: GameId } | Record<string, never>;

/**
 * WebSocket message router.
 * Routes incoming commands to the services, answers each with exactly one `ok` or `error` carrying the request id,
 * and manages the connection lifecycle.
 *
 * Equivalent to HTTP router + controller combined, since WebSocket
 * doesn't have a framework-provided routing layer.
 */
export class WsRouter {
  private gameOperations = new Map<GameId, Promise<void>>();
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
      const message = parsed.data;
      const result =
        message.type === "ping"
          ? {}
          : await this.inGameOrder(gameIdSchema.parse(message.payload.gameId), () =>
              connection.isOpen ? this.route(connection, user.id, message) : Promise.resolve({}),
            );
      if (connection.isOpen) connection.send({ type: WS_MESSAGE_TYPES.OK, id, payload: result });
    } catch (error) {
      if (isRefusal(error)) {
        logger.info(`[WS] ${parsed.data.type} refused: ${(error as Error).message}`);
      } else {
        logger.error(`[WS] Error handling ${parsed.data.type}:`, error);
      }
      if (connection.isOpen) replyError(connection, id, toWireError(error));
    }
  }

  async handleDisconnect(connection: Connection): Promise<void> {
    const { user } = connection;

    logger.info(`[WS] Disconnect: ${user.username}`);
    const disconnects = this.connectionManager.removeConnection(connection);

    for (const { gameId, userId } of disconnects) {
      await this.inGameOrder(gameId, async () => {
        if (!this.connectionManager.isPlayerInGameSession(gameId, userId)) {
          await this.handlePlayerDisconnect(gameId, userId);
        }
      });
    }
  }

  // Keep asynchronous disconnect cleanup and replacement joins in the same order.
  private async inGameOrder<T>(gameId: GameId, operation: () => Promise<T>): Promise<T> {
    const previous = this.gameOperations.get(gameId) ?? Promise.resolve();
    const result = previous.then(operation);
    const tail = result.then(
      () => {},
      () => {},
    );
    this.gameOperations.set(gameId, tail);
    try {
      return await result;
    } finally {
      if (this.gameOperations.get(gameId) === tail) this.gameOperations.delete(gameId);
    }
  }

  private async route(
    connection: Connection,
    userId: UserId,
    message: Exclude<ParsedClientMessage, { type: "ping" }>,
  ): Promise<CommandResult> {
    const gameId = gameIdSchema.parse(message.payload.gameId);

    switch (message.type) {
      case "join_game":
        this.connectionManager.addJoinedConnection(gameId, userId, connection);
        try {
          await this.joinGame(userId, gameId);
        } catch (error) {
          this.connectionManager.removeJoinedConnection(gameId, connection);
          throw error;
        }
        return { gameId };

      case "leave_game":
        await this.leaveGame(connection, userId, gameId);
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
        try {
          await this.sendGameView(connection, userId, gameId);
        } catch (error) {
          this.connectionManager.removeClient(gameId, userId, connection);
          throw error;
        }
        return { gameId };

      case "set_ready":
        await this.setReady(userId, gameId, message.payload.isReady);
        return {};

      case "make_move":
        await this.makeMove(userId, gameId, message.payload.move);
        return {};
    }
  }

  private async joinGame(userId: UserId, gameId: GameId): Promise<void> {
    try {
      await this.gameService.addPlayer(gameId, userId);
      logger.info(`User ${userId} joined game ${gameId}`);
    } catch (error) {
      if (!(error instanceof PlayerAlreadyInGameError)) throw error;
      logger.info(`User ${userId} reconnected to game ${gameId}`);
    }
  }

  private async leaveGame(connection: Connection, userId: UserId, gameId: GameId): Promise<void> {
    await this.gameService.removePlayer(gameId, userId);
    this.connectionManager.removeJoinedConnection(gameId, connection);
    if (this.connectionManager.gameOf(connection) === gameId) {
      this.connectionManager.removeClient(gameId, userId, connection);
    }

    logger.info(`User ${userId} left game ${gameId}`);
  }

  private async handlePlayerDisconnect(gameId: GameId, userId: UserId): Promise<void> {
    logger.info(`User ${userId} lost last connection to game ${gameId}`);

    try {
      await this.gameService.removePlayer(gameId, userId);
      logger.info(`Player ${userId} auto-removed from game ${gameId}`);
    } catch {
      logger.debug(`Player ${userId} not auto-removed from game ${gameId}`);
    }
  }

  private async sendGameView(connection: Connection, userId: UserId, gameId: GameId): Promise<void> {
    const view = await this.gameService.getGameView(gameId, userId);

    if (connection.isOpen) connection.send({ type: WS_MESSAGE_TYPES.GAME_STATE, payload: view });
  }

  private async setReady(userId: UserId, gameId: GameId, ready: boolean): Promise<void> {
    await this.gameService.setPlayerReady(gameId, userId, ready);

    logger.info(`Ready status: user ${userId} in game ${gameId} = ${ready}`);
  }

  private async makeMove(userId: UserId, gameId: GameId, move: MoveCommand): Promise<void> {
    await this.gameService.applyMove(gameId, userId, move);

    logger.info(`Move processed for user ${userId} in game ${gameId}`);
  }
}
