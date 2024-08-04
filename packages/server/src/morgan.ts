import morgan from "morgan";
import logger from "./logger";

export const morganMiddleware = morgan("dev", {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
});
