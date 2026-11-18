import { UserRow } from "@/model.ts";
import WebSocket from "ws";

export class AuthenticatedWebSocket extends WebSocket {
  public user?: UserRow;

  constructor(address: string | URL, protocols?: string | string[], options?: WebSocket.ClientOptions) {
    super(address, protocols, options);
  }
}
