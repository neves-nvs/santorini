import { FORCE_LOGS, LOG_LEVEL } from "./configs/config";
import { REDACTED, isSensitiveKey, redact } from "./redact";
import { createLogger, format, transports } from "winston";

const { combine, timestamp, colorize, printf } = format;

// https://github.com/winstonjs/winston/issues/1345
const uppercaseLevel = format((info) => {
  info.level = info.level.toUpperCase();
  return info;
});

const redactSecrets = format((info) => {
  for (const key of Object.keys(info)) {
    if (key !== "level" && key !== "message") {
      info[key] = isSensitiveKey(key) ? REDACTED : redact(info[key]);
    }
  }
  return info;
});

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]  ${message}`;
  if (metadata && Object.keys(metadata).length) {
    msg += ` | ${JSON.stringify(metadata, null, 2)}`;
  }
  return msg;
});

let silence = process.env.NODE_ENV === "test";
if (FORCE_LOGS === true) {
  silence = false;
}

const logger = createLogger({
  level: LOG_LEVEL,
  format: combine(redactSecrets(), uppercaseLevel(), colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
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
