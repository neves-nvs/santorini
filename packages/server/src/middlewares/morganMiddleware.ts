import morgan from "morgan";
import logger from "../logger";
import { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const HTTP_LOG_FORMAT = process.env.LOG_FORMAT ?? "dev";
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