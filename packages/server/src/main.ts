import { PORT } from './configs/config.ts';
import { app } from './app.ts';
import { createWebSocketServer } from './websockets/server.ts';
import logger from './logger.ts';

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

const wss = createWebSocketServer(server);

export { server, wss };
