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

app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }),
);

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

/* -------------------------------------------------------------------------- */
/*                                  Endpoints                                 */
/* -------------------------------------------------------------------------- */

app.get("/games", (req, res) => {
  res.send(gameRepository.getGamesIds());
});

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

app.post("/login", async (req, res) => {
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

  ws.on("close", () => {});
});
