import { Server } from "http";
import { WebSocketServer } from "ws";

import { webSocketAuthUpgrade } from "@/auth/webSocketAuth.ts";
import { wsRouter } from "@/composition-root.ts";
import logger from "@/logger.ts";

import { AuthenticatedWebSocket } from "./authenticatedWebsocket.ts";
import { monitorHeartbeat } from "./heartbeat.ts";
import { WebSocketConnection } from "./WebSocketConnection.ts";

const MAX_MESSAGE_BYTES = 16 * 1024;

/**
 * Creates and configures a WebSocket server attached to an HTTP server.
 * Handles connection lifecycle and delegates message routing to WsRouter.
 */
export function createWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ perMessageDeflate: false, noServer: true, maxPayload: MAX_MESSAGE_BYTES });

  wss.on("connection", (ws: AuthenticatedWebSocket) => {
    logger.debug("[WS] New connection");

    if (!ws.user) {
      ws.close();
      return;
    }
    const connection = new WebSocketConnection(ws, ws.user);
    monitorHeartbeat(ws);

    ws.on("error", (error: Error) => {
      logger.error("[WS] Error:", error);
    });

    ws.on("message", (message: string) => {
      void wsRouter.handleMessage(connection, message);
    });

    ws.on("close", () => {
      void wsRouter.handleDisconnect(connection);
    });
  });

  httpServer.on("upgrade", (request, socket, head) => {
    void webSocketAuthUpgrade(request, socket, head, wss);
  });

  return wss;
}
