import { createLogger, format, transports } from "winston";
import { config } from "./configs/config.ts";

const { combine, timestamp, colorize, printf } = format;

// https://github.com/winstonjs/winston/issues/1345
const uppercaseLevel = format((info) => {
  info.level = info.level.toUpperCase();
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
if (config.logging.force) {
  silence = false;
}

const logger = createLogger({
  level: config.logging.level,
  format: combine(uppercaseLevel(), colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
  transports: [
    new transports.Console({
      silent: silence,
    }),
  ],
});

if (process.env.LOG_LEVEL) {
  logger.info(`Log level set to '${config.logging.level}'`);
} else {
  logger.info(`Log level using default: '${config.logging.level}'`);
}

if (config.logging.force) {
  logger.warn("Forcing logs");
}

export default logger;
