import { FORCE_LOGS, LOG_LEVEL } from "./configs/config.ts";
import { createLogger, format, transports } from "winston";
import fastRedact from "fast-redact";

const { combine, timestamp, colorize, printf } = format;

// https://github.com/winstonjs/winston/issues/1345
const uppercaseLevel = format((info) => {
  info.level = info.level.toUpperCase();
  return info;
});

// Same path syntax as pino's `redact` option (pino uses fast-redact too).
const REDACTED_PATHS = [
  "password",
  "password_hash",
  "password_salt",
  "token",
  "authorization",
  "cookie",
  "*.password",
  "*.password_hash",
  "*.password_salt",
  "*.token",
  "*.authorization",
  "*.cookie",
];

function redactor(serialize: (value: unknown) => string) {
  const redact = fastRedact({ paths: REDACTED_PATHS, serialize });
  return (value: unknown) => (typeof value === "object" && value !== null ? String(redact(value)) : serialize(value));
}

const toPrettyJson = redactor((value) => JSON.stringify(value, null, 2));
export const toRedactedJson = redactor((value) => JSON.stringify(value));

export const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]  ${message}`;
  if (metadata && Object.keys(metadata).length) {
    msg += ` | ${toPrettyJson(metadata)}`;
  }
  return msg;
});

let silence = process.env.NODE_ENV === "test";
if (FORCE_LOGS === true) {
  silence = false;
}

const logger = createLogger({
  level: LOG_LEVEL,
  format: combine(uppercaseLevel(), colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
  transports: [
    new transports.Console({
      silent: silence,
    }),
  ],
});

if (process.env.LOG_LEVEL) {
  logger.info(`Log level set to '${LOG_LEVEL}'`);
} else {
  logger.info(`Log level using default: '${LOG_LEVEL}'`);
}

if (FORCE_LOGS === true) {
  logger.warn("Forcing logs");
}

export default logger;
