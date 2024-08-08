import morgan from "morgan";
import logger from "./logger";
import { Request } from "express";

export const morganMiddleware = morgan("dev", {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
});

morgan.token("body", (req: Request) => JSON.stringify(req.body));

export const morganBodyMiddleware = morgan("Request body: :body", {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
});
