import jwt, { JwtPayload } from "jsonwebtoken";

import { AuthenticatedWebSocket } from "../websockets";
import { IncomingMessage } from "http";
import { JWT_SECRET } from "../configs/config";
import { findUserByUsername } from "../users/userRepository";
import internal from "stream";
import logger from "../logger";
import { wss } from "../main";

export async function webSocketAuthUpgrade(request: IncomingMessage, socket: internal.Duplex, head: Buffer) {
  const authHeader = request.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    logger.error("No or malformed Authorization header");
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const user = await findUserByUsername(decoded.username);
    if (!user) {
      logger.error("User not found");
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      logger.info("WebSocket connection authenticated");

      const authWs = ws as AuthenticatedWebSocket;
      authWs.user = user;

      wss.emit("connection", authWs, request);
    });
  } catch (err) {
    logger.error("Invalid WebSocket token", err);
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
  }
}
