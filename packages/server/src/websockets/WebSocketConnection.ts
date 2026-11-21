import { ServerMessage } from "@santorini/shared";
import WebSocket from "ws";

import { Connection } from "@/game/infra/Connection.ts";
import { UserRow } from "@/model.ts";

export class WebSocketConnection implements Connection {
  constructor(
    private readonly socket: WebSocket,
    readonly user: UserRow,
  ) {}

  get isOpen(): boolean {
    return this.socket.readyState === WebSocket.OPEN;
  }

  send(message: ServerMessage): void {
    this.socket.send(JSON.stringify(message));
  }
}
