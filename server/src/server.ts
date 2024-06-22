import { createGame, getGame, getGamesIds } from "./gameRepository";

import WebSocket from "ws";
import cors from "cors";
import express from "express";

interface Message {
  type: string;
  payload: any;
}
const app = express();
const port = 8080;
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

app.get("/games", (req, res) => {
  res.send(getGamesIds());
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws: WebSocket) => {
  console.log("connected");

  ws.on("open", () => {
    console.log("opened");
  });

  ws.on("error", (error: Error) => {
    console.log("error", error);
  });

  ws.on("message", (message: string) => {
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

      default:
        console.log("Unknown message type:", type);
    }
  });

  ws.on("close", () => {
    console.log("disconnected");
    // Handle player disconnection logic
    // delete gameState.players[ws.id];
    // broadcastGameState();
  });
});

function handleCreateGame(ws: WebSocket, amountOfPlayers: number | undefined) {
  let game;
  if (amountOfPlayers) {
    // game = createGameWithPlayers(amountOfPlayers);
    game = createGame();
  } else {
    game = createGame();
  }

  ws.send(
    JSON.stringify({
      type: "success",
      payload: {
        gameId: game.getId(),
      },
    }),
  );
}

function handleJoinGame(ws: WebSocket, gameId: string, username: string) {
  const game = getGame(gameId);

  if (game === undefined) {
    ws.send(
      JSON.stringify({
        type: "error",
        payload: "Game not found",
      }),
    );
    return;
  }

  game.addPlayer(username);

  ws.send(
    JSON.stringify({
      type: "success",
      payload: {
        payload: {
          gameId: game.getId(),
          username: username,
        },
      },
    }),
  );
}

function handleGetGames(ws: WebSocket) {
  const games = getGamesIds();
  ws.send(
    JSON.stringify({
      type: "success",
      payload: games,
    }),
  );
}
