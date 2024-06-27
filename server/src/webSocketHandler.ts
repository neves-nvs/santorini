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

/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

export function handleMessage(ws: WebSocket, message: string) {
  const parsedMessage: Message = JSON.parse(message);
  const { type, payload } = parsedMessage;

  console.log("received message", parsedMessage);
  switch (type) {
    case "create_game":
      handleCreateGame(ws, payload.amountOfPlayers);
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

function handleCreateGame(ws: WebSocket, amountOfPlayers: number | undefined) {
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
  game.addPlayer(user);

  send(
    ws,
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
