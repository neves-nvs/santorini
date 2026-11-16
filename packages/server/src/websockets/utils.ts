import { CLIENT_MESSAGE_TYPES, WS_MESSAGE_TYPES } from "@santorini/shared";
import { Connection } from "../game/infra/Connection.ts";
import { sanitizeForLog } from "../logSanitizer.ts";

export function sendError(connection: Connection, message: string) {
  connection.send({ type: WS_MESSAGE_TYPES.ERROR, payload: message });
}

export function describeInvalidMessage(
  type: unknown,
  error: { issues: { path: PropertyKey[]; message: string }[] },
): string {
  if (typeof type !== "string" || !CLIENT_MESSAGE_TYPES.includes(type)) {
    return `Unknown message type: ${sanitizeForLog(type)}`;
  }
  const [issue] = error.issues;
  const field = issue.path.filter((key) => key !== "payload").join(".");
  return `Invalid ${type} payload: ${field ? `${field}: ` : ""}${issue.message}`;
}
