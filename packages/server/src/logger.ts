import { createLogger, format, transports } from "winston";

const { combine, timestamp, colorize, printf } = format;

// https://github.com/winstonjs/winston/issues/1345
const uppercaseLevel = format((info) => {
  info.level = info.level.toUpperCase();
  return info;
});

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `[${level}] ${timestamp} - ${message}`;
  if (metadata && Object.keys(metadata).length) {
    msg += ` | ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const DEFAULT_LOG_LEVEL = "http";
const LOG_LEVEL = process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL;

const logger = createLogger({
  level: LOG_LEVEL,
  format: combine(
    uppercaseLevel(),
    colorize(),
    timestamp({ format: "HH:mm:ss" }),
    logFormat,
  ),
  transports: [
    new transports.Console({
      silent: process.env.NODE_ENV === "test",
    }),
  ],
});

if (process.env.LOG_LEVEL) {
  logger.info(`Log level set to '${LOG_LEVEL}'`);
} else {
  logger.info(`Log level using default: '${LOG_LEVEL}'`);
}
export default logger;
