import dotenv from "dotenv";
import { createLogger, format, transports } from "winston";
import { FORCE_LOGS } from "./config";

const { combine, timestamp, colorize, printf } = format;

// https://github.com/winstonjs/winston/issues/1345
const uppercaseLevel = format((info) => {
  info.level = info.level.toUpperCase();
  return info;
});

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]  ${message}`;
  if (metadata && Object.keys(metadata).length) {
    msg += ` | ${JSON.stringify(metadata)}`;
  }
  return msg;
});

dotenv.config();

const DEFAULT_LOG_LEVEL = "http";
const LOG_LEVEL = process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL;

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
