import {
  ClientMessage,
  MakeMoveMessage,
  WS_MESSAGE_TYPES
} from "../../../shared/src/websocket-types";

import { AuthenticatedWebSocket } from "./authenticatedWebsocket";
import { GameError } from "../errors/GameErrors";
import { GameWsController } from "../game/transport/GameWsController";
import { LobbyWsController } from "../game/transport/LobbyWsController";
import { User } from "../model";
import { gameService } from "../composition-root";
import logger from "../logger";
import { sendError } from "./utils";
import { webSocketConnectionManager } from "../game/infra/WebSocketConnectionManager";

const gameController = new GameWsController();
const lobbyController = new LobbyWsController();

function getAuthenticatedUser(ws: AuthenticatedWebSocket): User | null {
  if (!ws.user) {
    sendError(ws, "Not authenticated");
    return null;
  }

  return ws.user;
}

/**
 * Handle WebSocket connection close.
 * If player loses all connections to a waiting game and hasn't readied,
 * they are automatically removed from the game.
 */
export async function handleConnectionClose(ws: AuthenticatedWebSocket) {
  const user = ws.user;
  if (!user) {
    logger.warn("Connection close from unauthenticated WebSocket");
    return;
  }

  logger.info(`Cleaning up connection for user ${user.username} (${user.id})`);

  const results = webSocketConnectionManager.removeConnection(ws);

  // For games where user lost their last connection, check if they should be auto-removed
  for (const { gameId, userId, wasLastConnection } of results) {
    if (wasLastConnection) {
      logger.info(`User ${userId} lost last connection to game ${gameId}, checking auto-remove`);

      try {
        // Try to remove player - will fail if game not waiting or player is ready
        const { game } = await gameService.removePlayer(gameId, userId);

        // Broadcast to remaining players that someone left
        webSocketConnectionManager.broadcastToGame(gameId, {
          type: WS_MESSAGE_TYPES.PLAYER_LEFT,
          payload: {
            gameId,
            userId,
            playerCount: game.players.size,
            maxPlayers: game.maxPlayers
          }
        });

        logger.info(`Player ${userId} auto-removed from game ${gameId}`);
      } catch (error) {
        // Expected if game is in-progress or player is ready - they stay in game
        logger.debug(`Player ${userId} not auto-removed from game ${gameId}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }
}

export async function handleMessage(ws: AuthenticatedWebSocket, message: string) {
  const user = getAuthenticatedUser(ws);
  if (!user) {
    logger.warn("Message received from unauthenticated WebSocket");
    return;
  }

  try {
    const parsedMessage = JSON.parse(message) as ClientMessage;
    const { type } = parsedMessage;

    logger.info(`Received message: ${type} from user ${user.username}`);
    logger.debug(`Payload: ${JSON.stringify(parsedMessage.payload)}`);

    switch (type) {
      case WS_MESSAGE_TYPES.SUBSCRIBE_GAME:
        if (!parsedMessage.payload?.gameId) {
          sendError(ws, "Game ID required");
          return;
        }
        await handleSubscribeGame(ws, parsedMessage.payload.gameId, user);
        break;

      case WS_MESSAGE_TYPES.JOIN_GAME:
        if (!parsedMessage.payload?.gameId) {
          sendError(ws, "Game ID required");
          return;
        }
        await handleJoinGame(ws, parsedMessage.payload.gameId, user);
        break;

      case WS_MESSAGE_TYPES.SET_READY:
        if (!parsedMessage.payload?.gameId || typeof parsedMessage.payload.isReady !== 'boolean') {
          sendError(ws, "Game ID and ready status required");
          return;
        }
        await handleSetReady(ws, parsedMessage.payload, user);
        break;

      case WS_MESSAGE_TYPES.MAKE_MOVE:
        await handleMakeMove(ws, parsedMessage, user);
        break;

      default:
        logger.warn(`Unknown message type: ${type} from user ${user.username}`);
        sendError(ws, `Unknown message type: ${type}`);
    }
  } catch (error) {
    logger.error(`Error handling WebSocket message from user ${user.username}:`, error);
    sendError(ws, "Invalid message format");
  }
}

async function handleSubscribeGame(ws: AuthenticatedWebSocket, gameId: number, user: User) {
  logger.info(`User ${user.username} subscribing to game ${gameId}`);

  try {
    webSocketConnectionManager.addClient(gameId, user.id, ws);

    await gameController.handleGetGameState(ws, user.id, { gameId });
  } catch (error) {
    logger.error(`Failed to subscribe to game ${gameId} for user ${user.username}:`, error);
    if (error instanceof GameError) {
      sendError(ws, error.userMessage);
    } else {
      sendError(ws, "Failed to subscribe to game");
    }
  }
}

async function handleJoinGame(ws: AuthenticatedWebSocket, gameId: number, user: User) {
  logger.info(`User ${user.username} joining game ${gameId} via WebSocket`);

  try {
    // Register WebSocket connection for this game (auto-subscribe on join)
    webSocketConnectionManager.addClient(gameId, user.id, ws);

    await lobbyController.handleJoinGame(ws, user.id, { gameId });
  } catch (error) {
    logger.error(`Failed to join game ${gameId} for user ${user.username}:`, error);
    if (error instanceof GameError) {
      sendError(ws, error.userMessage);
    } else {
      sendError(ws, "Failed to join game");
    }
  }
}

async function handleSetReady(ws: AuthenticatedWebSocket, payload: { gameId: number; isReady: boolean }, user: User) {
  const { gameId, isReady } = payload;
  logger.info(`User ${user.username} setting ready status to ${isReady} for game ${gameId}`);

  try {
    await gameController.handlePlayerReady(ws, user.id, { gameId, ready: isReady });
  } catch (error) {
    logger.error(`Error setting ready status for user ${user.username}:`, error);
    if (error instanceof GameError) {
      sendError(ws, error.userMessage);
    } else {
      sendError(ws, "Failed to set ready status");
    }
  }
}

async function handleMakeMove(ws: AuthenticatedWebSocket, message: MakeMoveMessage, user: User) {
  const { payload } = message;
  const { gameId, move } = payload;

  if (!gameId) {
    sendError(ws, "Game ID required");
    return;
  }

  logger.info(`User ${user.username} making move in game ${gameId}:`, JSON.stringify(move));

  try {
    await gameController.handleMove(ws, user.id, { gameId, move });
    logger.info(`Move processed successfully for user ${user.username} in game ${gameId}`);
  } catch (error) {
    logger.error(`Error processing move for user ${user.username}:`, error);
    if (error instanceof GameError) {
      sendError(ws, error.userMessage);
    } else {
      sendError(ws, "Failed to process move");
    }
  }
}
