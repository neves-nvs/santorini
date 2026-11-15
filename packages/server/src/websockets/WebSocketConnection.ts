import { Connection, OutgoingMessage } from "../game/infra/Connection.ts";
import { User } from "../model.ts";
import WebSocket from "ws";

export class WebSocketConnection implements Connection {
  constructor(
    private readonly socket: WebSocket,
    readonly user: User,
  ) {}

  get isOpen(): boolean {
    return this.socket.readyState === WebSocket.OPEN;
  }

  send(message: OutgoingMessage): void {
    this.socket.send(JSON.stringify(message));
  }
}
