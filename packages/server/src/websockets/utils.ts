import { CLIENT_MESSAGE_TYPES, WS_MESSAGE_TYPES, WireError } from "@santorini/shared";
import { Connection } from "@/game/infra/Connection.ts";
import { sanitizeForLog } from "@/logSanitizer.ts";

export function replyError(connection: Connection, id: string | undefined, error: WireError) {
  connection.send({ type: WS_MESSAGE_TYPES.ERROR, id, payload: error });
}

type Issues = { issues: { path: PropertyKey[]; message: string }[] };

export function describeInvalidMessage(type: unknown, error: Issues): WireError {
  if (typeof type !== "string" || !CLIENT_MESSAGE_TYPES.includes(type)) {
    return { code: "unknown_type", message: `Unknown message type: ${sanitizeForLog(type)}` };
  }

  const issues = error.issues.map((issue) => ({
    path: issue.path.filter((key) => key !== "payload").map(String),
    message: issue.message,
  }));
  const [first] = issues;
  const field = first.path.join(".");
  return {
    code: "invalid_payload",
    message: `Invalid ${type} payload: ${field ? `${field}: ` : ""}${first.message}`,
    details: { issues },
  };
}
