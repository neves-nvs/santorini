import { Connection } from "@/game/infra/Connection.ts";
import { ServerMessage } from "@santorini/shared";
import { User } from "@/model.ts";
import WebSocket from "ws";

export class WebSocketConnection implements Connection {
  constructor(
    private readonly socket: WebSocket,
    readonly user: User,
  ) {}

  get isOpen(): boolean {
    return this.socket.readyState === WebSocket.OPEN;
  }

  send(message: ServerMessage): void {
    this.socket.send(JSON.stringify(message));
  }
}
