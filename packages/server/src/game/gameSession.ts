import WebSocket from "ws";
import logger from "../logger";
import { findUsersByGame } from "./gameRepository";

interface GameConnection {
  clients: Map<number, WebSocket>;
}

const gameConnections = new Map<number, GameConnection>();

// Map to store player ready status for each game
// Structure: gameId -> Set<userId> (users who are ready)
const playerReadyStatus = new Map<number, Set<number>>();

export function addGameConnection(gameId: number) {
  logger.info(`Creating new game connection for game ${gameId}`);
  gameConnections.set(gameId, {
    clients: new Map(),
  });
}

export function isPlayerInGameSession(gameId: number, userId: number): boolean {
  const gameConnection = gameConnections.get(gameId);
  return gameConnection ? gameConnection.clients.has(userId) : false;
}

export function addClient(gameId: number, userId: number, ws: WebSocket) {
  let gameConnection = gameConnections.get(gameId);
  const hadGameConnection = !!gameConnection;
  const hadReadyStatus = playerReadyStatus.has(gameId);

  logger.info(`addClient: gameId=${gameId}, userId=${userId}, hadGameConnection=${hadGameConnection}, hadReadyStatus=${hadReadyStatus}`);

  // Debug: Show current game connections before adding
  const currentGames = Array.from(gameConnections.keys());
  logger.info(`Current game connections before adding client: [${currentGames.join(', ')}]`);

  if (!gameConnection) {
    logger.info(`Game ${gameId} not found, creating new game connection`);
    addGameConnection(gameId);
    gameConnection = gameConnections.get(gameId);
    // Only clear ready status if this is truly a new game (no existing ready players)
    // This prevents clearing ready status when players reconnect
    if (!hadReadyStatus) {
      logger.info(`Initializing ready status for new game ${gameId}`);
      clearPlayerReadyStatus(gameId);
    } else {
      logger.info(`Game ${gameId} already has ready status, preserving it. Current ready players: ${Array.from(playerReadyStatus.get(gameId) || [])}`);
    }
  }
  logger.info(`Adding client ${userId} to game ${gameId}`);
  if (gameConnection) {
    logger.info(`Client ${userId} added to game ${gameId}`);
    gameConnection.clients.set(userId, ws);

    // Debug: Show all clients in this game
    const clientIds = Array.from(gameConnection.clients.keys());
    logger.info(`Clients in game ${gameId}: [${clientIds.join(', ')}] (total: ${gameConnection.clients.size})`);

    // TODO send game state
    // ws.send(JSON.stringify());
  }
}

export function removeClient(gameId: number, userId: number) {
  const gameConnection = gameConnections.get(gameId);
  logger.info(`🔌 Removing client ${userId} from game ${gameId}`);
  if (gameConnection) {
    const sizeBefore = gameConnection.clients.size;
    gameConnection.clients.delete(userId);
    const sizeAfter = gameConnection.clients.size;
    logger.info(`🔌 Client ${userId} removed from game ${gameId}. Clients: ${sizeBefore} -> ${sizeAfter}`);

    // Log remaining clients
    const remainingClients = Array.from(gameConnection.clients.keys());
    logger.info(`🔌 Remaining clients in game ${gameId}: [${remainingClients.join(', ')}]`);
  } else {
    logger.warn(`🔌 No game connection found when trying to remove client ${userId} from game ${gameId}`);
  }
}

export function broadcastUpdate(gameId: number, update: any) {
  const gameConnection = gameConnections.get(gameId);

  // Debug: Show all available game connections
  const availableGames = Array.from(gameConnections.keys());
  logger.info(`Attempting to broadcast to game ${gameId}. Available games: [${availableGames.join(', ')}]`);

  if (gameConnection) {
    const clientCount = gameConnection.clients.size;
    logger.info(`Broadcasting ${update.type} to game ${gameId} - ${clientCount} connected clients`);
    const message = JSON.stringify(update);

    let sentCount = 0;
    gameConnection.clients.forEach((ws, userId) => {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
          sentCount++;
        } else {
          logger.warn(`WebSocket for user ${userId} in game ${gameId} is not open (state: ${ws.readyState})`);
        }
      } catch (error) {
        logger.error(`Failed to send message to user ${userId} in game ${gameId}:`, error);
      }
    });

    logger.info(`Successfully sent ${update.type} to ${sentCount}/${clientCount} clients in game ${gameId}`);
  } else {
    logger.warn(`No game connection found for game ${gameId} - cannot broadcast ${update.type}`);
    logger.warn(`Creating missing game connection for game ${gameId}`);

    // Try to create the missing game connection
    addGameConnection(gameId);

    // Try broadcasting again
    const newGameConnection = gameConnections.get(gameId);
    if (newGameConnection) {
      logger.info(`Created new game connection for game ${gameId}, but no clients connected yet`);
      logger.info(`Broadcast skipped - no clients in newly created game connection`);
    } else {
      logger.error(`Failed to create game connection for game ${gameId}`);
    }
  }
}

export function sendToPlayer(gameId: number, userId: number, update: any) {
  const gameConnection = gameConnections.get(gameId);
  if (gameConnection) {
    const ws = gameConnection.clients.get(userId);
    if (ws && ws.readyState === ws.OPEN) {
      logger.info(`Sending ${update.type} to specific player ${userId} in game ${gameId}`);
      ws.send(JSON.stringify(update));
    } else {
      logger.warn(`WebSocket for user ${userId} in game ${gameId} is not available or not open`);
    }
  } else {
    logger.warn(`No game connection found for game ${gameId} - cannot send ${update.type} to player ${userId}`);
  }
}

// Player ready status management
export function setPlayerReady(gameId: number, userId: number, isReady: boolean) {
  if (!playerReadyStatus.has(gameId)) {
    playerReadyStatus.set(gameId, new Set());
  }

  const readyPlayers = playerReadyStatus.get(gameId)!;
  if (isReady) {
    readyPlayers.add(userId);
  } else {
    readyPlayers.delete(userId);
  }

  const connectedPlayers = getConnectedPlayersCount(gameId);
  logger.info(`Player ${userId} in game ${gameId} ready status: ${isReady}. Ready players: ${Array.from(readyPlayers)} (${readyPlayers.size}/${connectedPlayers})`);
  logger.info(`setPlayerReady debug - gameId=${gameId}, userId=${userId}, isReady=${isReady}, readyPlayers.size=${readyPlayers.size}, connectedPlayers=${connectedPlayers}`);
}

export async function getPlayersReadyStatus(gameId: number): Promise<{ userId: number, isReady: boolean }[]> {
  const gameConnection = gameConnections.get(gameId);
  if (!gameConnection) {
    logger.info(`getPlayersReadyStatus: No game connection found for game ${gameId}`);
    return [];
  }

  const readyPlayers = playerReadyStatus.get(gameId) || new Set();

  // Use actual players in game from database, not WebSocket client keys
  const playersInGame = await findUsersByGame(gameId);
  const allPlayers = playersInGame.map(player => player.id);

  logger.info(`getPlayersReadyStatus: game ${gameId}, readyPlayers=${Array.from(readyPlayers)}, allPlayers=${allPlayers}, gameConnection.clients.size=${gameConnection.clients.size}`);

  const result = allPlayers.map(userId => ({
    userId,
    isReady: readyPlayers.has(userId)
  }));

  logger.info(`getPlayersReadyStatus result: ${JSON.stringify(result)}`);

  return result;
}

export async function areAllPlayersReady(gameId: number): Promise<boolean> {
  const gameConnection = gameConnections.get(gameId);
  if (!gameConnection) {
    logger.info(`areAllPlayersReady: No game connection found for game ${gameId}`);
    return false;
  }

  const readyPlayers = playerReadyStatus.get(gameId) || new Set();

  // Use actual players in game from database, not WebSocket client count
  const playersInGame = await findUsersByGame(gameId);
  const totalPlayers = playersInGame.length;

  const allReady = totalPlayers > 0 && readyPlayers.size === totalPlayers;

  logger.info(`areAllPlayersReady: game ${gameId}, readyPlayers=${readyPlayers.size}, totalPlayers=${totalPlayers} (from DB), connectedClients=${gameConnection.clients.size}, allReady=${allReady}`);
  return allReady;
}

export function clearPlayerReadyStatus(gameId: number) {
  logger.info(`Clearing ready status for game ${gameId}`);
  playerReadyStatus.delete(gameId);
}

export function getConnectedPlayersCount(gameId: number): number {
  const gameConnection = gameConnections.get(gameId);
  return gameConnection ? gameConnection.clients.size : 0;
}

// Test utility function to clean up all game sessions
export function clearAllGameSessions() {
  gameConnections.clear();
  playerReadyStatus.clear();
}
