import type { ServerMessage } from "@santorini/shared";
import { User } from "../../model.ts";

// TODO: add an SSE implementation of Connection (one text/event-stream response per game). The manager and the
// broadcaster need no change, but commands first need a transport-free command layer, because WsRouter runs and replies
// in the same method.
export interface Connection {
  readonly user: User;
  readonly isOpen: boolean;
  send(message: ServerMessage): void;
}
