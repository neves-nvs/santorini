import { PORT } from "./configs/config";
import WebSocket from "ws";
import { app } from "./app";
import { handleMessage } from "./websockets";
import logger from "./logger";
import { webSocketAuthUpgrade } from "./auth/webSocketAuth";

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ perMessageDeflate: false, noServer: true });

wss.on("listening", () => {
  logger.info("WebSocket server listening");
});

wss.on("connection", (ws) => {
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

server.on("upgrade", webSocketAuthUpgrade);

export { server, wss };
