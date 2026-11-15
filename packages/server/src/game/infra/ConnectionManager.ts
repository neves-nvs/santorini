import { Connection, OutgoingMessage } from "./Connection.ts";

import logger from "../../logger.ts";

/**
 * Connection Manager - Infrastructure Layer
 *
 * Tracks the connections subscribed to each game, whatever transport they use, and sends messages to them.
 */

export class ConnectionManager {
  // Primary: connection -> the games it is subscribed to (for cleanup on disconnect)
  private connectionGames = new Map<Connection, Set<number>>();

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
   * Add a client connection to a game
   */
  addClient(gameId: number, userId: number, connection: Connection): void {
    let gameConnection = this.gameConnections.get(gameId);

    if (!gameConnection) {
      this.addGameConnection(gameId);
      gameConnection = this.gameConnections.get(gameId)!;
    }

    logger.info(`Adding client ${userId} to game ${gameId}`);

    // 1. Remember which games this connection is subscribed to (primary index)
    let games = this.connectionGames.get(connection);
    if (!games) {
      games = new Set();
      this.connectionGames.set(connection, games);
    }
    games.add(gameId);

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
   * Remove a connection from one game.
   * Returns whether the user has no connection left in that game.
   */
  removeClient(gameId: number, userId: number, connection: Connection): boolean {
    logger.info(`Removing client ${userId} from game ${gameId}`);

    const games = this.connectionGames.get(connection);
    if (games) {
      games.delete(gameId);
      if (games.size === 0) {
        this.connectionGames.delete(connection);
      }
    }

    this.gameConnections.get(gameId)?.delete(connection);

    let wasLastConnection = false;
    const gameUsers = this.userGameConnections.get(gameId);
    const userConnections = gameUsers?.get(userId);
    if (gameUsers && userConnections) {
      userConnections.delete(connection);
      if (userConnections.size === 0) {
        gameUsers.delete(userId);
        wasLastConnection = true;
      }
    }

    logger.info(`Client ${userId} removed from game ${gameId}, wasLastConnection: ${wasLastConnection}`);
    return wasLastConnection;
  }

  /**
   * Remove a connection from every game it is subscribed to (on disconnect).
   * Returns the games where the user lost their last connection.
   */
  removeConnection(connection: Connection): { gameId: number; userId: number; wasLastConnection: boolean }[] {
    const games = this.connectionGames.get(connection);
    if (!games) {
      return [];
    }

    const userId = connection.user.id;
    return Array.from(games, (gameId) => ({
      gameId,
      userId,
      wasLastConnection: this.removeClient(gameId, userId, connection),
    }));
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
    this.connectionGames.clear();
    this.gameConnections.clear();
    this.userGameConnections.clear();
    this.playerReadyStatus.clear();
  }
}

export const connectionManager = new ConnectionManager();
