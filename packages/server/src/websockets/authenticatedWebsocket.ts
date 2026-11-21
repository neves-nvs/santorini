import WebSocket from "ws";

import { UserRow } from "@/model.ts";

export class AuthenticatedWebSocket extends WebSocket {
  public user?: UserRow;

  constructor(address: string | URL, protocols?: string | string[], options?: WebSocket.ClientOptions) {
    super(address, protocols, options);
  }
}
