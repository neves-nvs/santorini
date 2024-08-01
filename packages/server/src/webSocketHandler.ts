import { Game } from "./game/game";
import { WebSocket } from "ws";
import { gameRepository } from "./game/gameRepository";
import { userRepository } from "./users/userRespository";

interface Message {
  type: string;
  payload: any;
}

/* -------------------------------------------------------------------------- */
/*                                    UTILS                                   */
/* -------------------------------------------------------------------------- */

function send(ws: WebSocket, type: string, payload: any) {
  ws.send(JSON.stringify({ type: type, payload: payload }));
}

function broadcastToGame(game: Game, type: string, payload: any) {
  game.getConnections().forEach((connection: WebSocket) => {
    send(connection as WebSocket, type, payload);
  });
}

/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

export function handleMessage(ws: WebSocket, message: string) {
  const parsedMessage: Message = JSON.parse(message);
  const { type, payload } = parsedMessage;
  console.log("\"" + type + "\"" + " " + payload);

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

function handleSubscribeGame(ws: WebSocket, gameID: string, username: string) {
  const game = getGameOrError(ws, gameID);
  const user = getUserOrError(ws, username);
  if (game === undefined || user === undefined) {
    return;
  }

  console.log("User", user.getUsername(), "subscribed to game", gameID);
  game.addConnection(user.getUsername(), ws);
  // TODO send whole game state

  // TODO push all info to user
  broadcastToGame(
    game,
    "current_players",
    game.getPlayers().map(player => player.getUsername()),
  );
}

function getGameOrError(ws: WebSocket, gameID: string) {
  const game = gameRepository.getGame(gameID);
  if (game === undefined) {
    send(ws, "error", "Game not found");
    return;
  }
  return game;
}

function getUserOrError(ws: WebSocket, username: string) {
  const user = userRepository.getUser(username);
  if (user === undefined) {
    send(ws, "error", "User not found");
    return;
  }
  return user;
}

/* -------------------------------------------------------------------------- */
/*                                 PUSH EVENTS                                */
/* -------------------------------------------------------------------------- */

export function updatePlays(ws: WebSocket, plays: any) {
  send(ws, "available_plays", plays);
}
