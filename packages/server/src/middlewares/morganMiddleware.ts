import { Request } from "express";

import { HTTP_LOG_FORMAT } from "../configs/config";
import logger from "../logger";
import { redact } from "../redact";
import morgan from "morgan";

if (process.env.HTTP_LOG_FORMAT) {
  logger.info(`HTTP log format set to ${HTTP_LOG_FORMAT}`);
} else {
  logger.debug(`HTTP log format using default: ${HTTP_LOG_FORMAT}`);
}

export const morganMiddleware = morgan(HTTP_LOG_FORMAT, {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
});

morgan.token("body", (req: Request) => JSON.stringify(redact(req.body)));

export const morganBodyMiddleware = morgan("Request body: :body", {
  stream: {
    write: (message) => logger.debug(message.trim()),
  },
});
