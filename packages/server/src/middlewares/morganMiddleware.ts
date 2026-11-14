import { Request, Response } from "express";
import logger, { toRedactedJson } from "../logger.ts";

import { config } from "../configs/config.ts";
import morgan from "morgan";

if (process.env.HTTP_LOG_FORMAT) {
  logger.info(`HTTP log format set to ${config.logging.httpFormat}`);
} else {
  logger.debug(`HTTP log format using default: ${config.logging.httpFormat}`);
}

export const morganMiddleware = morgan(config.logging.httpFormat, {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
});

morgan.token("body", (req: Request) => toRedactedJson(req.body));

export const morganBodyMiddleware = morgan("Request body: :body", {
  stream: {
    write: (message) => logger.debug(message.trim()),
  },
});

morgan.token("res-body", (req, res: Response) => {
  return toRedactedJson(res.locals.body);
});

export const morganResBodyMiddleware = morgan("Response body: :res-body", {
  stream: {
    write: (message) => logger.debug(message.trim()),
  },
});
