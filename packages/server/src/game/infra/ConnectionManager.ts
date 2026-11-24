import { GameId, UserId } from "@santorini/engine";

import logger from "@/logger.ts";

import { Connection } from "./Connection.ts";

/**
 * Connection Manager - Infrastructure Layer
 *
 * Tracks the connections subscribed to each game, whatever transport they use, and sends messages to them.
 */

interface ConnectionContext {
  userId: UserId;
  gameId: GameId;
}

export class ConnectionManager {
  // Primary: connection -> context (for cleanup on disconnect)
  private connections = new Map<Connection, ConnectionContext>();
  private joinedConnections = new Map<Connection, Map<GameId, UserId>>();

  // Index 1: gameId -> Set<Connection> (for broadcasting)
  private gameConnections = new Map<number, Set<Connection>>();

  // Index 2: gameId -> userId -> Set<Connection> (for user-specific messages)
  private userGameConnections = new Map<number, Map<number, Set<Connection>>>();

  /**
   * Create a new game connection pool
   */
  addGameConnection(gameId: GameId): void {
    logger.info(`Creating new game connection for game ${gameId}`);
    this.gameConnections.set(gameId, new Set());
  }

  /**
   * Check if a player is connected to a game session
   */
  isPlayerInGameSession(gameId: GameId, userId: UserId): boolean {
    return (
      [...(this.userGameConnections.get(gameId)?.get(userId) ?? [])].some((connection) => connection.isOpen) ||
      [...this.joinedConnections].some(([connection, games]) => connection.isOpen && games.get(gameId) === userId)
    );
  }

  addJoinedConnection(gameId: GameId, userId: UserId, connection: Connection): void {
    const games = this.joinedConnections.get(connection) ?? new Map<GameId, UserId>();
    games.set(gameId, userId);
    this.joinedConnections.set(connection, games);
  }

  removeJoinedConnection(gameId: GameId, connection: Connection): void {
    const games = this.joinedConnections.get(connection);
    games?.delete(gameId);
    if (games?.size === 0) this.joinedConnections.delete(connection);
  }

  /**
   * The game a connection is subscribed to, if any. A connection follows one game at a time.
   */
  gameOf(connection: Connection): number | undefined {
    return this.connections.get(connection)?.gameId;
  }

  /**
   * Add a client connection to a game
   */
  addClient(gameId: GameId, userId: UserId, connection: Connection): void {
    let gameConnection = this.gameConnections.get(gameId);

    if (!gameConnection) {
      this.addGameConnection(gameId);
      gameConnection = this.gameConnections.get(gameId)!;
    }

    logger.info(`Adding client ${userId} to game ${gameId}`);

    // 1. Store connection context (primary index)
    this.connections.set(connection, { userId, gameId });

    // 2. Add to game's connection set (for broadcasting)
    gameConnection.add(connection);

    // 3. Add to user-game index (for user-specific messages)
    let gameUsers = this.userGameConnections.get(gameId);
    if (!gameUsers) {
      gameUsers = new Map();
      this.userGameConnections.set(gameId, gameUsers);
    }

    let userConnections = gameUsers.get(userId);
    if (!userConnections) {
      userConnections = new Set();
      gameUsers.set(userId, userConnections);
    }

    userConnections.add(connection);

    logger.info(`Client ${userId} added to game ${gameId}. Total connections: ${gameConnection.size}`);
  }

  /**
   * Remove a client from a specific game
   */
  removeClient(gameId: GameId, userId: UserId, connection: Connection): void {
    logger.info(`Removing client ${userId} from game ${gameId}`);

    // Remove from connections map
    this.connections.delete(connection);

    // Remove from game's connection set
    const gameConnection = this.gameConnections.get(gameId);
    if (gameConnection) {
      gameConnection.delete(connection);
    }

    // Remove from user-game index
    const gameUsers = this.userGameConnections.get(gameId);
    if (gameUsers) {
      const userConnections = gameUsers.get(userId);
      if (userConnections) {
        userConnections.delete(connection);
        if (userConnections.size === 0) {
          gameUsers.delete(userId);
        }
      }
    }

    logger.info(`Client ${userId} removed from game ${gameId}`);
  }

  /**
   * Remove a single connection (on disconnect).
   * Returns info about games where user lost their last connection.
   */
  removeConnection(connection: Connection): { gameId: GameId; userId: UserId; wasLastConnection: boolean }[] {
    const games = new Map(this.joinedConnections.get(connection));
    const context = this.connections.get(connection);
    if (context) {
      games.set(context.gameId, context.userId);
      this.removeClient(context.gameId, context.userId, connection);
    }
    this.joinedConnections.delete(connection);
    return [...games].map(([gameId, userId]) => ({
      gameId,
      userId,
      wasLastConnection: !this.isPlayerInGameSession(gameId, userId),
    }));
  }

  /**
   * The open sockets subscribed to a game, with the user behind each
   */
  subscribers(gameId: GameId): { connection: Connection; userId: UserId }[] {
    return [...(this.gameConnections.get(gameId) ?? [])].flatMap((connection) => {
      const context = this.connections.get(connection);
      return context && connection.isOpen ? [{ connection, userId: context.userId }] : [];
    });
  }

  /**
   * Get the number of connected players in a game
   */
  getConnectedPlayersCount(gameId: GameId): number {
    const gameConnection = this.gameConnections.get(gameId);
    return gameConnection ? gameConnection.size : 0;
  }

  /**
   * Clear all game sessions (for testing)
   */
  clearAllGameSessions(): void {
    this.connections.clear();
    this.joinedConnections.clear();
    this.gameConnections.clear();
    this.userGameConnections.clear();
  }
}

export const connectionManager = new ConnectionManager();
