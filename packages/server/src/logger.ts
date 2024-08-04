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

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
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

export default logger;
