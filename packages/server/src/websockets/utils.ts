import { Connection } from "../game/infra/Connection.ts";
import { WS_MESSAGE_TYPES } from "../../../shared/src/websocket-types.ts";

export function sendError(connection: Connection, message: string) {
  connection.send({ type: WS_MESSAGE_TYPES.ERROR, payload: message });
}
