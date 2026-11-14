import { AuthenticatedWebSocket } from "./authenticatedWebsocket.ts";
import { Server } from "http";
import { WebSocketServer } from "ws";
import logger from "../logger.ts";
import { webSocketAuthUpgrade } from "../auth/webSocketAuth.ts";
import { wsRouter } from "../composition-root.ts";

/**
 * Creates and configures a WebSocket server attached to an HTTP server.
 * Handles connection lifecycle and delegates message routing to WsRouter.
 */
export function createWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ perMessageDeflate: false, noServer: true });

  wss.on("connection", (ws: AuthenticatedWebSocket) => {
    logger.debug("[WS] New connection");

    ws.on("error", (error: Error) => {
      logger.error("[WS] Error:", error);
    });

    ws.on("message", (message: string) => {
      void wsRouter.handleMessage(ws, message);
    });

    ws.on("close", () => {
      void wsRouter.handleDisconnect(ws);
    });
  });

  httpServer.on("upgrade", (request, socket, head) => {
    void webSocketAuthUpgrade(request, socket, head, wss);
  });

  return wss;
}
