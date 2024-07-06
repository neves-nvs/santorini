import { Game } from "./game/game";
import { User } from "./users/user";
import WebSocket from "ws";
import { gameRepository } from "./game/gameRepository";
import { get } from "http";
import { userRepository } from "./users/userRespository";

interface Message {
  type: string;
  payload: any;
}

/* -------------------------------------------------------------------------- */
/*                                  ARGUMENTS                                 */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                    UTILS                                   */
/* -------------------------------------------------------------------------- */

function send(ws: WebSocket, type: string, payload: any) {
  ws.send(JSON.stringify({ type: type, payload: payload }));
}

function broadcastToGame(game: Game, type: string, payload: any) {
  game.getPlayers().forEach((player: User) => {
    player.getConnections().forEach(connection => {
      send(connection, type, payload);
    });
  });
}

/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

export function handleMessage(ws: WebSocket, message: string) {
  const parsedMessage: Message = JSON.parse(message);
  const { type, payload } = parsedMessage;

  console.log("received message", parsedMessage);
  switch (type) {
    case "get_games":
      handleGetGames(ws);
      break;

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
  console.log("game", game);
  console.log("user", username);
  if (game === undefined || user === undefined) {
    return;
  }

  user.addConnection(ws);
  // TODO send whole game state

  broadcastToGame(
    game,
    "current_players",
    game.getPlayers().map(player => player.getUsername()),
  );

  if (game.hasEnoughPlayers()) {
    game.start();
    broadcastToGame(game, "game_started", { game });
  }
}

function handleGetGames(ws: WebSocket) {
  const games = gameRepository.getGamesIds();
  send(ws, "success", games);
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


