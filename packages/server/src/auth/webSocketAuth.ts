import jwt, { JwtPayload } from "jsonwebtoken";

import { AuthenticatedWebSocket } from "../websockets/authenticatedWebsocket";
import { IncomingMessage } from "http";
import { JWT_SECRET } from "../configs/config";
import WebSocket from "ws";
import { findUserByUsername } from "../users/userRepository";
import internal from "stream";
import logger from "../logger";

export async function webSocketAuthUpgrade(request: IncomingMessage, socket: internal.Duplex, head: Buffer, wss: WebSocket.Server) {
  const authHeader = request.headers["authorization"];
  let token: string | null = null;

  logger.info("WebSocket upgrade request received");

  // Try to get token from Authorization header first
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    // Try to get token from query parameters
    if (request.url) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const queryToken = url.searchParams.get('token');
      if (queryToken) {
        token = queryToken;
      }
    }

    // Fallback: try to get token from cookies
    if (!token) {
      const cookieHeader = request.headers.cookie;
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);

        token = cookies.token;
      }
    }
  }

  if (!token) {
    logger.error("No authentication token found in Authorization header, query params, or cookies");
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

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
