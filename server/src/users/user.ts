import { WebSocket } from "ws";

export class User {
  private username: string;
  private connections: WebSocket[] = [];

  constructor(username: string) {
    this.username = username;
  }

  getUsername(): string {
    return this.username;
  }

  addConnection(connection: WebSocket) {
    this.connections.push(connection);
  }

  getConnections() {
    return this.connections;
  }
}
