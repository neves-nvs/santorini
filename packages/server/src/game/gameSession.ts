import WebSocket from "ws";
import logger from "../logger";

interface GameConnection {
  clients: Map<number, WebSocket>;
}

const gameConnections = new Map<number, GameConnection>();

export function addGameConnection(gameId: number) {
  gameConnections.set(gameId, {
    clients: new Map(),
  });
}

export function addClient(gameId: number, userId: number, ws: WebSocket) {
  let gameConnection = gameConnections.get(gameId);
  if (!gameConnection) {
    logger.info(`Game ${gameId} not found, creating new game connection`);
    addGameConnection(gameId);
    gameConnection = gameConnections.get(gameId);
  }
  logger.info(`Adding client ${userId} to game ${gameId}`);
  if (gameConnection) {
    logger.info(`Client ${userId} added to game ${gameId}`);
    gameConnection.clients.set(userId, ws);
    // TODO send game state
    // ws.send(JSON.stringify());
  }
}

export function removeClient(gameId: number, userId: number) {
  const gameConnection = gameConnections.get(gameId);
  logger.info(`Removing client ${userId} from game ${gameId}`);
  if (gameConnection) {
    gameConnection.clients.delete(userId);
  }
}

export function broadcastUpdate(gameId: number, update: any) {
  const gameConnection = gameConnections.get(gameId);
  if (gameConnection) {
    logger.info(`Broadcasting update to game ${gameId}`);
    // const message = JSON.stringify({ type: "gameUpdate", data: update });
    const message = JSON.stringify(update);
    gameConnection.clients.forEach((ws) => ws.send(message));
  }
}
