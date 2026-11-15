import { User } from "../../model.ts";

export interface OutgoingMessage {
  type: string;
  payload?: unknown;
}

export interface Connection {
  readonly user: User;
  readonly isOpen: boolean;
  send(message: OutgoingMessage): void;
}
