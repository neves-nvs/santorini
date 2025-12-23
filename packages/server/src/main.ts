import { PORT } from './configs/config';
import { app } from './app';
import { createWebSocketServer } from './websockets/server';
import logger from './logger';

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

const wss = createWebSocketServer(server);

export { server, wss };
