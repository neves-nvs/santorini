import { handleConnectionClose, handleMessage } from './messageHandler';

import { Server } from 'http';
import WebSocket from 'ws';
import logger from '../logger';
import { webSocketAuthUpgrade } from '../auth/webSocketAuth';

/**
 * Creates and configures a WebSocket server attached to an HTTP server.
 * Handles connection lifecycle, message routing, and authentication.
 */
export function createWebSocketServer(httpServer: Server): WebSocket.Server {
  const wss = new WebSocket.Server({ perMessageDeflate: false, noServer: true });

  wss.on('listening', () => {
    logger.info('WebSocket server listening');
  });

  wss.on('connection', (ws) => {
    logger.info('WebSocket connection');

    ws.on('open', () => {
      logger.info('WebSocket open');
    });

    ws.on('error', (error: Error) => {
      logger.error('WebSocket error', error);
    });

    ws.on('message', (message: string) => {
      logger.silly('WebSocket message', message);
      void handleMessage(ws, message);
    });

    ws.on('close', (code, reason) => {
      logger.info('WebSocket connection closed', code, reason);
      void handleConnectionClose(ws);
    });
  });

  httpServer.on('upgrade', (request, socket, head) => {
    void webSocketAuthUpgrade(request, socket, head, wss);
  });

  return wss;
}

