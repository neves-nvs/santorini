import { WebSocket } from "ws";
import * as gameSession from "../game/gameSession";
import logger from "../logger";
import { findUserByUsername } from "../users/userRepository";
import { findGameById } from "../game/gameRepository";
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

// function broadcastToGame(game: Game, type: string, payload: unknown) {
//   game.getConnections().forEach((connection: WebSocket) => {
//     send(connection as WebSocket, type, payload);
//   });
// }

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
      console.log("Unknown message type:", type);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  HANDLERS                                  */
/* -------------------------------------------------------------------------- */

async function handleSubscribeGame(ws: WebSocket, gameID: number, username: string) {
  const game = await getGameOrError(ws, gameID);
  const user = await getUserOrError(ws, username);
  if (game === undefined || user === undefined) {
    return;
  }

  logger.info(`User ${user.username} joined game ${gameID}`);

  gameSession.addClient(gameID, user.id, ws);

  // TODO send whole game state

  // TODO push all info to user

  gameSession.broadcastUpdate(gameID, {
    type: "current_players",
    // TODO send usernames
    // payload: game.getPlayers().map((player) => player.username),
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

export function updatePlays(ws: WebSocket, plays: unknown) {
  send(ws, "available_plays", plays);
}
