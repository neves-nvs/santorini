import { Connection, OutgoingMessage } from "./Connection.ts";

import logger from "../../logger.ts";

/**
 * Connection Manager - Infrastructure Layer
 *
 * Tracks the connections subscribed to each game, whatever transport they use, and sends messages to them.
 */

interface ConnectionContext {
  userId: number;
  gameId: number;
}

export class ConnectionManager {
  // Primary: connection -> context (for cleanup on disconnect)
  private connections = new Map<Connection, ConnectionContext>();

  // Index 1: gameId -> Set<Connection> (for broadcasting)
  private gameConnections = new Map<number, Set<Connection>>();

  // Index 2: gameId -> userId -> Set<Connection> (for user-specific messages)
  private userGameConnections = new Map<number, Map<number, Set<Connection>>>();

  // Map to store player ready status for each game
  private playerReadyStatus = new Map<number, Set<number>>();

  /**
   * Create a new game connection pool
   */
  addGameConnection(gameId: number): void {
    logger.info(`Creating new game connection for game ${gameId}`);
    this.gameConnections.set(gameId, new Set());
  }

  /**
   * Check if a player is connected to a game session
   */
  isPlayerInGameSession(gameId: number, userId: number): boolean {
    const gameUsers = this.userGameConnections.get(gameId);
    return gameUsers ? gameUsers.has(userId) : false;
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
  addClient(gameId: number, userId: number, connection: Connection): void {
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
  removeClient(gameId: number, userId: number, connection: Connection): void {
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
  removeConnection(connection: Connection): { gameId: number; userId: number; wasLastConnection: boolean }[] {
    const context = this.connections.get(connection);
    if (!context) {
      return [];
    }

    const { gameId, userId } = context;
    logger.info(`Removing connection for user ${userId} from game ${gameId}`);

    // Remove from primary index
    this.connections.delete(connection);

    // Remove from game's connection set
    const gameConnection = this.gameConnections.get(gameId);
    if (gameConnection) {
      gameConnection.delete(connection);
    }

    // Remove from user-game index and check if it was the last connection
    let wasLastConnection = false;
    const gameUsers = this.userGameConnections.get(gameId);
    if (gameUsers) {
      const userConnections = gameUsers.get(userId);
      if (userConnections) {
        userConnections.delete(connection);
        if (userConnections.size === 0) {
          gameUsers.delete(userId);
          wasLastConnection = true;
        }
      }
    }

    logger.info(`Connection removed for user ${userId} from game ${gameId}, wasLastConnection: ${wasLastConnection}`);

    return [{ gameId, userId, wasLastConnection }];
  }

  /**
   * Remove a client from all games (on disconnect).
   * Returns games where user lost their last connection.
   * @deprecated Use removeConnection instead for single connection removal
   */
  removeClientFromAllGames(userId: number): { gameId: number; wasLastConnection: boolean }[] {
    logger.info(`Removing client ${userId} from all games due to connection close`);

    const results: { gameId: number; wasLastConnection: boolean }[] = [];
    const processedGames = new Set<number>();

    // Find all connections for this user
    const connectionsToRemove: { connection: Connection; gameId: number }[] = [];
    for (const [connection, context] of this.connections) {
      if (context.userId === userId) {
        connectionsToRemove.push({ connection, gameId: context.gameId });
      }
    }

    // Remove each connection
    for (const { connection, gameId } of connectionsToRemove) {
      this.connections.delete(connection);

      const gameConnection = this.gameConnections.get(gameId);
      if (gameConnection) {
        gameConnection.delete(connection);
      }

      const gameUsers = this.userGameConnections.get(gameId);
      if (gameUsers) {
        const userConnections = gameUsers.get(userId);
        if (userConnections) {
          userConnections.delete(connection);
          if (userConnections.size === 0) {
            gameUsers.delete(userId);
            if (!processedGames.has(gameId)) {
              results.push({ gameId, wasLastConnection: true });
              processedGames.add(gameId);
            }
          }
        }
      }
    }

    logger.info(`Client ${userId} removed from games: [${results.map((r) => r.gameId).join(", ")}]`);
    return results;
  }

  /**
   * Broadcast a message to all players in a game
   */
  broadcastToGame(gameId: number, message: OutgoingMessage): void {
    const gameConnection = this.gameConnections.get(gameId);
    if (!gameConnection || gameConnection.size === 0) {
      logger.warn(`No connections found for game ${gameId} - cannot broadcast ${message.type}`);
      return;
    }

    let sentCount = 0;

    gameConnection.forEach((connection) => {
      if (connection.isOpen) {
        connection.send(message);
        sentCount++;
      }
    });

    logger.info(`Broadcasted ${message.type} to ${sentCount}/${gameConnection.size} connections in game ${gameId}`);
  }

  /**
   * Send a message to a specific player in a game
   */
  sendToPlayer(gameId: number, userId: number, message: OutgoingMessage): void {
    const gameUsers = this.userGameConnections.get(gameId);
    if (!gameUsers) {
      logger.warn(`No game connection found for game ${gameId} - cannot send ${message.type} to player ${userId}`);
      return;
    }

    const userConnections = gameUsers.get(userId);
    if (!userConnections || userConnections.size === 0) {
      logger.warn(`No connections found for user ${userId} in game ${gameId}`);
      return;
    }

    let sentCount = 0;

    userConnections.forEach((connection) => {
      if (connection.isOpen) {
        connection.send(message);
        sentCount++;
      }
    });

    logger.debug(`Sent ${message.type} to player ${userId} in game ${gameId} (${sentCount} connections)`);
  }

  /**
   * Set a player as ready in a game
   */
  setPlayerReady(gameId: number, userId: number): void {
    let readyPlayers = this.playerReadyStatus.get(gameId);
    if (!readyPlayers) {
      readyPlayers = new Set();
      this.playerReadyStatus.set(gameId, readyPlayers);
    }

    readyPlayers.add(userId);
    logger.info(`Player ${userId} is ready in game ${gameId}. Ready players: ${Array.from(readyPlayers).join(", ")}`);
  }

  /**
   * Set a player as not ready in a game
   */
  setPlayerNotReady(gameId: number, userId: number): void {
    const readyPlayers = this.playerReadyStatus.get(gameId);
    if (readyPlayers) {
      readyPlayers.delete(userId);
      logger.info(
        `Player ${userId} is no longer ready in game ${gameId}. Ready players: ${Array.from(readyPlayers).join(", ")}`,
      );
    }
  }

  /**
   * Get ready players for a game
   */
  getReadyPlayers(gameId: number): number[] {
    const readyPlayers = this.playerReadyStatus.get(gameId);
    return readyPlayers ? Array.from(readyPlayers) : [];
  }

  /**
   * Clear all ready status for a game
   */
  clearPlayerReadyStatus(gameId: number): void {
    logger.info(`Clearing ready status for game ${gameId}`);
    this.playerReadyStatus.delete(gameId);
  }

  /**
   * Get the number of connected players in a game
   */
  getConnectedPlayersCount(gameId: number): number {
    const gameConnection = this.gameConnections.get(gameId);
    return gameConnection ? gameConnection.size : 0;
  }

  /**
   * Clear all game sessions (for testing)
   */
  clearAllGameSessions(): void {
    this.connections.clear();
    this.gameConnections.clear();
    this.userGameConnections.clear();
    this.playerReadyStatus.clear();
  }
}

export const connectionManager = new ConnectionManager();
