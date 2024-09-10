import { User } from "../model";
import WebSocket from "ws";

export class AuthenticatedWebSocket extends WebSocket {
  public user?: User;

  constructor(address: string | URL, protocols?: string | string[], options?: WebSocket.ClientOptions) {
    super(address, protocols, options);
  }
}
