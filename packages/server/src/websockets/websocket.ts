import jwt, { JwtPayload } from "jsonwebtoken";

import { AuthenticatedWebSocket } from "./authenticatedWebsocket";
import { JWT_SECRET } from "../configs/config";
import WebSocket from "ws";
import { findUserByUsername } from "../users/userRepository";
import { handleMessage } from "./messageHandler";
import logger from "../logger";

export const setupWebSocketServer = (wss: WebSocket.Server) => {
  wss.on("connection", (ws) => {
    logger.info("WebSocket connection");
    ws.on("message", (message: string) => {
      logger.info("WebSocket message", message);
      handleMessage(ws, message);
    });
    ws.on("close", (code, reason) => {
      logger.info("WebSocket connection closed", code, reason);
    });
  });

  wss.on("upgrade", async (request, socket, head) => {
    const token = request.headers["sec-websocket-protocol"];
    if (!token) {
      socket.destroy();
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const user = await findUserByUsername(decoded.username);
      if (!user) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        const authWs = new AuthenticatedWebSocket(ws.url);
        authWs.user = user;
        wss.emit("connection", authWs, request);
      });
    } catch (err) {
      logger.error("Invalid WebSocket token", err);
      socket.destroy();
    }
  });
};
