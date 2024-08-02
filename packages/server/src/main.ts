import WebSocket from "ws";
import cors from "cors";
import express from "express";
import { gameRepository } from "./game/gameRepository";
import { handleMessage } from "./webSocketHandler";
import logger from "./logger";
import { morganMiddleware } from "./morgan";
import { userRepository } from "./users/userRepository";

const PORT = process.env.PORT || 8081;

const app = express();

app.use(morganMiddleware);

app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173",
}));

/* -------------------------------------------------------------------------- */
/*                               Authentication                               */
/* -------------------------------------------------------------------------- */

app.post("/users", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username) {
    logger.error("Username required");
    return res.status(400).send("All fields are required");
  }
  try {
    userRepository.createUser(username);
  } catch (e: any) {
    logger.error(e.message);
    return res.status(400).send(e.message);
  }
  res.status(201).send("User created successfully");
});

// TODO should be GET or POST to /session-token
app.post("/login", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    logger.error("Username required");
    return res.status(400).send("Username required");
  }

  const user = userRepository.getUser(username);
  if (!user) {
    logger.error("User not found");
    return res.status(400).send("User not found");
  }

  res.status(200).send("Login successful");
});

/* -------------------------------------------------------------------------- */
/*                                   /games                                   */
/* -------------------------------------------------------------------------- */

app.get("/games", (req, res) => {
  // TODO filter per public games
  res.send(gameRepository.getGamesIds());
});

// app.get("/games/:gameID/players", (req, res) => {
//   logger.info("GET /games/:gameID/players", req.params);
//   const { gameID } = req.params;
//   // check if game is public or user in game
//   const game = gameRepository.getGame(gameID);
//   if (!game) {
//     return res.status(400).send("Game not found");
//   }
//   res.send(game.getPlayers());
// });

app.post("/games", (req, res) => {
  const { username, amountOfPlayers } = req.body as { username: string, amountOfPlayers: number | undefined };
  // TODO input validation
  // TODO add user as owner (created game and can therefore delete it)
  const game = gameRepository.createGame({ username, amountOfPlayers });
  res.status(201).send({ gameId: game.getId() });
});

app.delete("/games/:gameId", (req, res) => {
  // const { gameId } = req.params;
  // check owner of game
  // gameRepository.deleteGame(gameId);
  // res.status(204).send();
});

// TODO right now only handling adding a player to a game should update other info on game or find better way
// app.put("/games/", (req, res) => {
// app.post("/games/:gameID/join", (req, res) => { // TODO FIX :gameID does not match UUID
//   const gameID = req.params.gameID;
app.post("/games/join", (req, res) => {
  logger.info("POST /games/join", req.body);

  const { username, gameID } = req.body;
  if (!gameID) { return res.status(400).send("Game ID required"); }
  if (!username) { return res.status(400).send("Username required"); }

  // TODO proper input validation
  //  TODO check if token matches username

  const game = gameRepository.getGame(gameID);
  if (!game) { return res.status(400).send("Game not found"); }
  const user = userRepository.getUser(username);
  if (!user) { return res.status(400).send("User not found"); }

  const success = game.addPlayer(user)
  if (!success) { return res.status(400).send("Game full"); }

  // TODO should be triggered elsewhere or inside the addPlayer call
  if (game.isReadyToStart()) {
    game.start();
    const currentPlayer = game.getCurrentPlayer();

    console.assert(currentPlayer, "No current player");
    if (!currentPlayer) { // Note: there should never be a state where the game starts without a current player
      return res.status(500).send("No current player");
    }

    game.updatePlays(currentPlayer.getUsername());
  }

  res.status(201).send({ gameId: game.getId() });
});

app.get("/games/plays", (req, res) => {
  logger.info("GET /games/plays", req.body);
  const { gameID, playerID } = req.body;
  if (!gameID) { return res.status(400).send("Game ID required"); }
  if (!playerID) { return res.status(400).send("Player ID required"); }
  // check if player is in game
  // check if player is allowed to see moves

  const game = gameRepository.getGame(gameID);
  if (!game) { return res.status(400).send("Game not found"); }
  const player = userRepository.getUser(playerID);
  if (!player) { return res.status(400).send("Player not found"); }

  const moves = game.getPlays(player.getUsername());
  res.send(moves);
});

app.post("/games/plays", (req, res) => {
  logger.info("POST /games/plays", req.body);
  const { gameID, playerID, play } = req.body;
  if (!gameID) { return res.status(400).send("Game ID required"); }
  if (!playerID) { return res.status(400).send("Player ID required"); }
  if (!play) { return res.status(400).send("Play required"); }
  // check if player is in game
  // check if player is allowed to make move
  // check if move is valid

  const game = gameRepository.getGame(gameID);
  if (!game) { return res.status(400).send("Game not found"); }
  const player = userRepository.getUser(playerID);
  if (!player) { return res.status(400).send("Player not found"); }

  // game.makePlay(player.getUsername(), play);
  res.status(201).send();
});

/* -------------------------------------------------------------------------- */
/*                                   Servers                                  */
/* -------------------------------------------------------------------------- */

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });
wss.on("listening", () => {
  logger.info("WebSocket server listening");
});

/* -------------------------------------------------------------------------- */
/*                                 WebSockets                                 */
/* -------------------------------------------------------------------------- */

wss.on("connection", (ws: WebSocket) => {
  logger.info("WebSocket connection");

  ws.on("open", () => {
    logger.info("WebSocket open");
  });

  ws.on("error", (error: Error) => {
    logger.error("WebSocket error", error);
  });

  ws.on("message", (message: string) => {
    logger.info("WebSocket message", message);
    handleMessage(ws, message);
  });

  ws.on("close", (code, reason) => {
    logger.info("WebSocket connection closed", code, reason);
  });
});
