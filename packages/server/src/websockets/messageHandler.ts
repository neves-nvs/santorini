import * as gameSession from "../game/gameSession";
import * as gameActionService from "../game/gameActionService";

import { findGameById, findUsersByGame } from "../game/gameRepository";
import { generateGameStateForFrontend } from "../game/gameStateService";

import { WebSocket } from "ws";
import { findUserByUsername } from "../users/userRepository";
import { User } from "../model";
import logger from "../logger";
import {
  WS_MESSAGE_TYPES,
  GenericWSMessage,
  MakeMoveMessage
} from "../../../shared/src/websocket-types";

interface Message extends GenericWSMessage { }

function send(ws: WebSocket, type: string, payload: unknown) {
  ws.send(JSON.stringify({ type: type, payload: payload }));
}

function getAuthenticatedUser(ws: WebSocket): User | null {
  const user = (ws as any).user;
  if (!user) {
    send(ws, WS_MESSAGE_TYPES.ERROR, "Not authenticated");
    return null;
  }
  return user;
}

export function handleMessage(ws: WebSocket, message: string) {
  const parsedMessage: Message = JSON.parse(message);
  const { type } = parsedMessage;
  const payload = parsedMessage.payload as {
    gameId: number;
  };

  logger.info(`Received message: ${type}`);
  logger.debug(`Payload: ${JSON.stringify(payload)}`);

  const user = getAuthenticatedUser(ws);
  if (!user) {
    logger.warn("Message received from unauthenticated WebSocket");
    return;
  }

  switch (type) {
    case WS_MESSAGE_TYPES.SUBSCRIBE_GAME:
      handleSubscribeGame(ws, payload.gameId, user.username);
      break;

    case WS_MESSAGE_TYPES.UNSUBSCRIBE_GAME:
      handleUnsubscribeGame(ws, payload.gameId, user.username);
      break;

    case WS_MESSAGE_TYPES.JOIN_GAME:
      handleJoinGame(ws, payload.gameId, user.username);
      break;

    case WS_MESSAGE_TYPES.MAKE_MOVE:
      handleMakeMove(ws, parsedMessage as MakeMoveMessage);
      break;

    case WS_MESSAGE_TYPES.SET_READY:
      handleSetReady(ws, payload as { gameId: number; isReady: boolean }, user.username);
      break;

    default:
      logger.error("Unknown message type:", type);
  }
}

async function handleMakeMove(ws: WebSocket, message: MakeMoveMessage) {
  const payload = message.payload;

  logger.info(`Received make_move:`, JSON.stringify(payload, null, 2));

  const user = getAuthenticatedUser(ws);
  if (!user) {
    logger.warn("Move attempt without authentication");
    return;
  }

  const gameId = payload.gameId;
  if (!gameId) {
    send(ws, WS_MESSAGE_TYPES.ERROR, "Game ID required");
    return;
  }

  logger.info(`User ${user.username} (${user.id}) making move in game ${gameId}:`, payload.move);

  const result = await gameActionService.processMove(gameId, user.id, payload.move);

  if (!result.success) {
    send(ws, WS_MESSAGE_TYPES.ERROR, result.error || "Failed to process move");
    return;
  }

  logger.info(`Move processed successfully for user ${user.username} in game ${gameId}`);
}







async function handleJoinGame(ws: WebSocket, gameId: number, username: string) {
  logger.info(`User ${username} joining game ${gameId} via WebSocket`);

  const game = await getGameOrError(ws, gameId);
  const user = await getUserOrError(ws, username);
  if (game === undefined || user === undefined) {
    return;
  }

  try {
    const gameService = await import("../game/gameService");
    await gameService.addPlayerToGame(gameId, user);

    const gameSession = await import("../game/gameSession");
    gameSession.addClient(gameId, user.id, ws);
    const currentGame = await findGameById(gameId);
    if (currentGame) {
      await sendGameStateWithReadyStatus(ws, gameId, currentGame, user.id);
    }

    logger.info(`✅ User ${username} successfully joined game ${gameId} via WebSocket`);

  } catch (error) {
    logger.error(`Failed to join game ${gameId} for user ${username}:`, error);

    if (error instanceof Error) {
      if (error.message === "Game is full") {
        send(ws, "error", "Game is full");
      } else if (error.message === "Game not found") {
        send(ws, "error", "Game not found");
      } else if (error.message.includes("duplicate key")) {
        send(ws, "error", "Already in game");
      } else {
        send(ws, "error", "Failed to join game");
      }
    }
  }
}

async function handleSubscribeGame(ws: WebSocket, gameId: number, username: string) {
  logger.info(`User ${username} is trying to join game ${gameId}`);
  const game = await getGameOrError(ws, gameId);
  const user = await getUserOrError(ws, username);
  if (game === undefined || user === undefined) {
    return;
  }

  logger.info(`User ${user.username} subscribing to game ${gameId}`);

  const wasAlreadyInSession = gameSession.isPlayerInGameSession(gameId, user.id);
  gameSession.addClient(gameId, user.id, ws);

  const currentGame = await findGameById(gameId);
  const playersInGame = await findUsersByGame(gameId);

  logger.info(`Sending game state to user ${user.username}:`, {
    gameExists: !!currentGame,
    playersCount: playersInGame.length,
    players: playersInGame,
    wasReconnection: wasAlreadyInSession
  });

  if (currentGame) {
    await sendGameStateWithReadyStatus(ws, gameId, currentGame, user.id);

    if (currentGame?.game_status === 'in-progress' &&
      currentGame?.current_player_id === user.id &&
      currentGame?.game_phase) {

      logger.info(`Sending available_plays to reconnected current player ${user.id} in game ${gameId}`);

      const { getAvailablePlays } = await import('../game/turnManager');
      const availablePlays = await getAvailablePlays(gameId);
      send(ws, "available_plays", availablePlays);
    }
  }

  if (currentGame?.game_status === 'waiting') {
    send(ws, "players_in_game", playersInGame);
  }

  if (currentGame) {
    const playersReadyStatus = await gameSession.getPlayersReadyStatus(gameId);
    const formattedGameState = await generateGameStateForFrontend(currentGame, gameId);
    logger.info(`Broadcasting game_state_update for subscription to game ${gameId}`);

    if (currentGame.game_status === 'waiting') {
      gameSession.broadcastUpdate(gameId, {
        type: "game_state_update",
        payload: {
          ...formattedGameState,
          playersReadyStatus: playersReadyStatus
        }
      });
    } else {
      gameSession.broadcastUpdate(gameId, {
        type: "game_state_update",
        payload: formattedGameState
      });
    }
  }

  if (!wasAlreadyInSession && currentGame?.game_status === 'waiting') {
    logger.info(`New player subscription - broadcasting player list update to other players`);
    gameSession.broadcastUpdate(gameId, {
      type: "players_in_game",
      payload: playersInGame,
    });
  }

  // Check if game is full (only for new connections)
  if (!wasAlreadyInSession) {
    logger.info(`Game ${gameId} WebSocket status check: playersInGame.length=${playersInGame.length}, maxPlayers=${currentGame?.player_count}, currentGame.game_status=${currentGame?.game_status}`);
    if (currentGame && playersInGame.length === currentGame.player_count && currentGame.game_status === "waiting") {
      logger.info(`Game ${gameId} is full (${playersInGame.length}/${currentGame.player_count}) - players can now ready up!`);

      // Game stays in "waiting" - no status change needed
      // Players will ready up, then game transitions to "in-progress"

      // Broadcast that game is full and ready for player confirmations
      logger.info(`Broadcasting game_ready_for_start for game ${gameId}`);
      gameSession.broadcastUpdate(gameId, { type: "game_ready_for_start" });

      // Send updated game state to ALL players
      const updatedGame = await findGameById(gameId);
      const playersReadyStatus = await gameSession.getPlayersReadyStatus(gameId);
      logger.info(`Broadcasting game_state_update for game ${gameId} with status: ${updatedGame?.game_status} to all players`);
      // Use formatted game state with additional WebSocket fields
      const formattedGameState = await generateGameStateForFrontend(updatedGame, gameId);
      gameSession.broadcastUpdate(gameId, {
        type: "game_state_update",
        payload: {
          ...formattedGameState,
          playersReadyStatus: playersReadyStatus
        }
      });
    }
  }
}

/**
 * Handle player setting ready status
 */
async function handleSetReady(ws: WebSocket, payload: { gameId: number; isReady: boolean }, username: string) {
  const { gameId, isReady } = payload;
  logger.info(`User ${username} setting ready status to ${isReady} for game ${gameId}`);

  const user = getAuthenticatedUser(ws);
  if (!user) {
    logger.warn("Set ready attempt without authentication");
    return;
  }

  // Delegate to game action service
  const result = await gameActionService.setPlayerReady(gameId, user.id, isReady);

  if (!result.success) {
    send(ws, WS_MESSAGE_TYPES.ERROR, result.error || "Failed to set ready status");
  }
}

async function handleUnsubscribeGame(ws: WebSocket, gameId: number, username: string) {
  logger.info(`User ${username} is unsubscribing from game ${gameId}`);
  const user = await getUserOrError(ws, username);
  if (user === undefined) {
    return;
  }

  // Remove user from game session
  gameSession.removeClient(gameId, user.id);
  logger.info(`User ${username} (${user.id}) unsubscribed from game ${gameId}`);
}

function getGameOrError(ws: WebSocket, gameID: number) {
  const game = findGameById(gameID);
  if (game === undefined) {
    send(ws, "error", "Game not found");
    return;
  }
  return game;
}

async function sendGameStateWithReadyStatus(ws: WebSocket, gameId: number, game: any, userId?: number): Promise<void> {
  const playersReadyStatus = await gameSession.getPlayersReadyStatus(gameId);
  const currentUserReady = userId ? playersReadyStatus.find(p => p.userId === userId)?.isReady || false : false;

  const formattedGameState = await generateGameStateForFrontend(game, gameId);

  if (game.game_status === 'waiting') {
    send(ws, "game_state_update", {
      ...formattedGameState,
      currentUserReady: currentUserReady,
      playersReadyStatus: playersReadyStatus
    });
  } else {
    send(ws, "game_state_update", formattedGameState);
  }
}

function getUserOrError(ws: WebSocket, username: string): Promise<User | undefined> {
  const user = findUserByUsername(username);
  if (user === undefined) {
    send(ws, "error", "User not found");
    return Promise.resolve(undefined);
  }
  return user;
}