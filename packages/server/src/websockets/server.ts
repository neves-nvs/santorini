import { AuthenticatedWebSocket } from './authenticatedWebsocket';
import { Server } from 'http';
import WebSocket from 'ws';
import logger from '../logger';
import { webSocketAuthUpgrade } from '../auth/webSocketAuth';
import { wsRouter } from '../composition-root';

/**
 * Creates and configures a WebSocket server attached to an HTTP server.
 * Handles connection lifecycle and delegates message routing to WsRouter.
 */
export function createWebSocketServer(httpServer: Server): WebSocket.Server {
  const wss = new WebSocket.Server({ perMessageDeflate: false, noServer: true });

  wss.on('connection', (ws: AuthenticatedWebSocket) => {
    logger.debug('[WS] New connection');

    ws.on('error', (error: Error) => {
      logger.error('[WS] Error:', error);
    });

    ws.on('message', (message: string) => {
      void wsRouter.handleMessage(ws, message);
    });

    ws.on('close', () => {
      void wsRouter.handleDisconnect(ws);
    });
  });

  httpServer.on('upgrade', (request, socket, head) => {
    void webSocketAuthUpgrade(request, socket, head, wss);
  });

  return wss;
}

