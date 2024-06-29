import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize } = format;

const devFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  format: combine(
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    devFormat,
  ),
  transports: [new transports.Console()],
});

export default logger;
