import { Game } from "./game/game";
import { User } from "./users/user";
import WebSocket from "ws";
import { gameRepository } from "./game/gameRepository";
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
    case "create_game":
      handleCreateGame(ws, payload.amountOfPlayers, payload.username);
      break;

    case "join_game":
      handleJoinGame(ws, payload.gameId, payload.username);
      break;

    case "get_games":
      handleGetGames(ws);
      break;

    default:
      console.log("Unknown message type:", type);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  HANDLERS                                  */
/* -------------------------------------------------------------------------- */

function handleCreateGame(
  ws: WebSocket,
  amountOfPlayers: number | undefined,
  username: string,
) {
  const owner = userRepository.getUser(username);
  if (owner === undefined) {
    send(ws, "error", "User not found");
    return;
  }

  let game;
  if (amountOfPlayers) {
    // game = createGameWithPlayers(amountOfPlayers);
    game = gameRepository.createGame();
  } else {
    game = gameRepository.createGame();
  }

  send(ws, "success", { gameId: game.getId() });
}

function handleJoinGame(ws: WebSocket, gameID: string, username: string) {
  const game = gameRepository.getGame(gameID);
  if (game === undefined) {
    send(ws, "error", "Game not found");
    return;
  }

  const user = userRepository.getUser(username);
  if (user === undefined) {
    send(ws, "error", "User not found");
    return;
  }
  user.addConnection(ws);

  game.addPlayer(user);

  broadcastToGame(
    game,
    "current_players",
    game.getPlayers().map(player => player.getUsername()),
  );

  if (game.hasEnoughPlayers()) {
    game.start();
    send(ws, "game_started", { game });
  }
}

function handleGetGames(ws: WebSocket) {
  const games = gameRepository.getGamesIds();
  send(ws, "success", games);
}
