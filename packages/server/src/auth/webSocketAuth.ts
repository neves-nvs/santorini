import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthenticatedWebSocket } from "../websockets/authenticatedWebsocket.ts";
import { IncomingMessage } from "http";
import { WebSocketServer } from "ws";
import { config } from "../configs/config.ts";
import { findUserByUsername } from "../users/userRepository.ts";
import internal from "stream";
import logger from "../logger.ts";
import { webSocketTickets } from "./webSocketTickets.ts";

function requestScheme(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-proto"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return "encrypted" in request.socket ? "https" : "http";
}

function isAllowedOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) {
    return true;
  }
  if (config.allowedOrigins.includes(origin)) {
    return true;
  }
  try {
    const { protocol, host } = new URL(origin);
    return host === request.headers.host && protocol === `${requestScheme(request)}:`;
  } catch {
    return false;
  }
}

function usernameFromBearerToken(request: IncomingMessage): string | null {
  const authHeader = request.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const decoded = jwt.verify(authHeader.split(" ")[1], config.jwtSecret) as JwtPayload;
  return decoded.username;
}

function usernameFromTicket(request: IncomingMessage): string | null {
  const ticket = new URL(request.url ?? "/", "http://localhost").searchParams.get("ticket");
  return ticket ? webSocketTickets.consume(ticket) : null;
}

export async function webSocketAuthUpgrade(
  request: IncomingMessage,
  socket: internal.Duplex,
  head: Buffer,
  wss: WebSocketServer,
) {
  logger.info("WebSocket upgrade request received");

  if (!isAllowedOrigin(request)) {
    logger.warn(`WebSocket upgrade rejected for origin ${request.headers.origin}`);
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  try {
    const username = usernameFromBearerToken(request) ?? usernameFromTicket(request);
    if (!username) {
      logger.error("No Bearer token or valid ticket on the WebSocket upgrade");
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const user = await findUserByUsername(username);
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
