import { app } from "./app.ts";
import { config } from "./configs/config.ts";
import { createWebSocketServer } from "./websockets/server.ts";
import logger from "./logger.ts";

const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

const wss = createWebSocketServer(server);

export { server, wss };
