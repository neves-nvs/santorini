import { PORT } from "./config";
import WebSocket from "ws";
import authController from "./authentication/authController";
import cors from "cors";
import express from "express";
import gameService from "./game/gameService";
import { handleMessage } from "./webSockets";
import logger from "./logger";
import { morganMiddleware } from "./morgan";
import passport from "passport";
import userController from "./users/userController";

const app = express();

app.use(morganMiddleware);

app.use(express.json());
app.use(passport.initialize());

app.use(cors({ origin: "http://localhost:5173" }));

app.use("/", authController);
app.use("/games", gameService);
app.use("/users", userController);

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on("listening", () => {
  logger.info("WebSocket server listening");
});

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

export { app, server };
