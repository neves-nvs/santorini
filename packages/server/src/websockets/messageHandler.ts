import * as gameSession from "../game/gameSession";

import { findGameById, findPlayersByGameId } from "../game/gameRepository";

import { UserDTO } from "../users/userDTO";
import { WebSocket } from "ws";
import { findUserByUsername } from "../users/userRepository";
import logger from "../logger";

interface Message {
  type: string;
  payload: unknown;
}

/* -------------------------------------------------------------------------- */
/*                                    UTILS                                   */
/* -------------------------------------------------------------------------- */

function send(ws: WebSocket, type: string, payload: unknown) {
  ws.send(JSON.stringify({ type: type, payload: payload }));
}

/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

export function handleMessage(ws: WebSocket, message: string) {
  const parsedMessage: Message = JSON.parse(message);
  const { type } = parsedMessage;
  const payload = parsedMessage.payload as {
    gameId: number;
    username: string;
  };

  logger.info(`Received message: ${type}`);
  logger.debug(`Payload: ${JSON.stringify(payload)}`);

  switch (type) {
    case "subscribe_game":
      handleSubscribeGame(ws, payload.gameId, payload.username);
      break;

    default:
      logger.error("Unknown message type:", type);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  HANDLERS                                  */
/* -------------------------------------------------------------------------- */

async function handleSubscribeGame(ws: WebSocket, gameId: number, username: string) {
  logger.info(`User ${username} is trying to join game ${gameId}`);
  const game = await getGameOrError(ws, gameId);
  const user = await getUserOrError(ws, username);
  if (game === undefined || user === undefined) {
    return;
  }

  logger.info(`User ${user.username} joined game ${gameId}`);

  gameSession.addClient(gameId, user.id, ws);

  // TODO send whole game state
  // TODO push all info to user

  const playersInGame = await findPlayersByGameId(gameId);
  gameSession.broadcastUpdate(gameId, {
    type: "players_in_game",
    payload: playersInGame,
  });
}

function getGameOrError(ws: WebSocket, gameID: number) {
  const game = findGameById(gameID);
  if (game === undefined) {
    send(ws, "error", "Game not found");
    return;
  }
  return game;
}

function getUserOrError(ws: WebSocket, username: string) {
  const user = findUserByUsername(username);
  if (user === undefined) {
    send(ws, "error", "User not found");
    return;
  }
  return user;
}

/* -------------------------------------------------------------------------- */
/*                                 PUSH EVENTS                                */
/* -------------------------------------------------------------------------- */

export function updatePlayersInGame(gameId: number, players: UserDTO[]) {
  gameSession.broadcastUpdate(gameId, {
    type: "players_in_game",
    payload: players.map((player) => player.username),
  });
}

export function updatePlays(ws: WebSocket, plays: unknown) {
  send(ws, "available_plays", plays);
}
