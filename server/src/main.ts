import WebSocket from "ws";
import cors from "cors";
import express from "express";
import { gameRepository } from "./game/gameRepository";
import { handleMessage } from "./webSocketHandler";
import logger from "./logger";
import morgan from "morgan";
import { userRepository } from "./users/userRespository";

const PORT = 8081;

const app = express();

// app.use(
//   morgan("combined", {
//     stream: {
//       write: (message: string) => logger.info(message.trim()),
//     },
//   }),
// );

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

/* -------------------------------------------------------------------------- */
/*                               Authentication                               */
/* -------------------------------------------------------------------------- */

app.post("/users", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username) {
    return res.status(400).send("All fields are required");
  }
  try {
    userRepository.createUser(username);
  } catch (e: any) {
    return res.status(400).send(e.message);
  }
  res.status(201).send("User created successfully");
});

// TODO should be GET or POST to /session-token
app.post("/login", async (req, res) => {
  console.log("POST /login", req.body);
  const { username } = req.body;
  if (!username) {
    return res.status(400).send("Username required");
  }

  const user = userRepository.getUser(username);
  if (!user) {
    return res.status(400).send("User not found");
  }

  res.status(200).send("Login successful");
});

/* -------------------------------------------------------------------------- */
/*                                   /games                                   */
/* -------------------------------------------------------------------------- */

app.get("/games", (req, res) => {
  console.log("GET /games");
  // TODO filter per public games
  res.send(gameRepository.getGamesIds());
});

app.get("/games/:gameID/players", (req, res) => {
  const { gameID } = req.params;
  // check if game is public or user in game
  const game = gameRepository.getGame(gameID);
  if (!game) {
    return res.status(400).send("Game not found");
  }
  res.send(game.getPlayers());
});

app.post("/games", (req, res) => {
  console.log("POST /games", req.body);
  const { username, amountOfPlayers } = req.body as { username: string, amountOfPlayers: number | undefined };
  // TODO input validation
  // TODO add user as owner (created game and can therefore delete it)
  const game = gameRepository.createGame({ username, amountOfPlayers });
  res.status(201).send({ gameId: game.getId() });
});

// TODO right now only handling adding a player to a game should update other info on game or find better way
// app.put("/games/", (req, res) => {
// app.post("/games/:gameID/join", (req, res) => { // TODO FIX :gameID does not match UUID
//   const gameID = req.params.gameID;
app.post("/games/join", (req, res) => {
  console.log("POST /games/join", req.body);
  const { username, gameID } = req.body;
  console.log("gameID", gameID);
  console.log("username", username);
  if (!gameID) { return res.status(400).send("Game ID required"); }
  if (!username) { return res.status(400).send("Username required"); }
  // TODO proper input validation
  //  TODO check if token matches username

  const game = gameRepository.getGame(gameID);
  if (!game) { return res.status(400).send("Game not found"); }
  const user = userRepository.getUser(username);
  if (!user) { return res.status(400).send("User not found"); }


  try {
    game.addPlayer(user)
  } catch (e: any) {
    return res.status(400).send(e.message);
  }
  res.status(201).send({ gameId: game.getId() });
});

app.delete("/games/:gameId", (req, res) => {
  // const { gameId } = req.params;
  // check owner of game
  // gameRepository.deleteGame(gameId);
  // res.status(204).send();
});


/* -------------------------------------------------------------------------- */
/*                                   Servers                                  */
/* -------------------------------------------------------------------------- */

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });
wss.on("listening", () => {
  console.log("WebSocket server listening");
});

/* -------------------------------------------------------------------------- */
/*                                 WebSockets                                 */
/* -------------------------------------------------------------------------- */

wss.on("connection", (ws: WebSocket) => {
  ws.on("open", () => {
    console.log("opened");
  });

  ws.on("error", (error: Error) => {
    console.error("WebSocket error", error);
  });

  ws.on("message", (message: string) => {
    handleMessage(ws, message);
  });

  ws.on("close", () => { });
});
