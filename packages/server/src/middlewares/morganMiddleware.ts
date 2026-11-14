import { Request, Response } from "express";

import { config } from "../configs/config.ts";
import logger from "../logger.ts";
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

// TODO: debug-only, this logs secrets; never run with LOG_LEVEL=debug in production
morgan.token("body", (req: Request) => JSON.stringify(req.body));

export const morganBodyMiddleware = morgan("Request body: :body", {
  stream: {
    write: (message) => logger.debug(message.trim()),
  },
});

morgan.token("res-body", (req, res: Response) => {
  const body = res.locals.body;
  return JSON.stringify(body);
});

export const morganResBodyMiddleware = morgan("Response body: :res-body", {
  stream: {
    write: (message) => logger.debug(message.trim()),
  },
});
