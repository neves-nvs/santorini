import { AuthenticatedWebSocket } from "./authenticatedWebsocket";
import { WS_MESSAGE_TYPES } from "../../../shared/src/websocket-types";

/**
 * Send a WebSocket message with the standard { type, payload } format
 */
export function send(ws: AuthenticatedWebSocket, type: string, payload?: unknown) {
  ws.send(JSON.stringify({ type, payload }));
}

/**
 * Send an error message to the WebSocket client
 */
export function sendError(ws: AuthenticatedWebSocket, message: string) {
  send(ws, WS_MESSAGE_TYPES.ERROR, message);
}
