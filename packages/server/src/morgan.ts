import logger from "./logger";
import morgan from "morgan";

export const morganMiddleware = morgan(
    "dev",
    {
        stream: {
            write: (message) => logger.http(message.trim()),
        },
    });