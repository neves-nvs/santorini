/**
 * Composition Root
 *
 * Single place where all services are instantiated and wired together.
 * This ensures each service has exactly one instance and proper dependencies.
 *
 * Layer hierarchy:
 *   Infrastructure → Domain → Application → Transport
 */

import { GameBroadcaster } from './game/application/GameBroadcaster';
import { GameRepositoryDb } from './game/infra/GameRepositoryDb';
import { GameService } from './game/application/GameService';
import { GameViewBuilder } from './game/domain/GameViewBuilder';
import { LobbyService } from './game/application/LobbyService';
import { WsRouter } from './websockets/WsRouter';
import { createGameRoutes } from './game/transport/GameHttpController';
import { db } from './database';
import { webSocketConnectionManager } from './game/infra/WebSocketConnectionManager';

// Infrastructure
const gameRepository = new GameRepositoryDb(db);

// Domain
const gameViewBuilder = new GameViewBuilder();

// Application
const gameBroadcaster = new GameBroadcaster(gameViewBuilder, webSocketConnectionManager);
const gameService = new GameService(gameRepository, gameViewBuilder, gameBroadcaster);
const lobbyService = new LobbyService(gameRepository);

// Transport
const wsRouter = new WsRouter(gameService, lobbyService, webSocketConnectionManager);
const gameRoutes = createGameRoutes(gameService, lobbyService, gameBroadcaster);

export {
  // Infrastructure
  gameRepository,
  webSocketConnectionManager,

  // Domain
  gameViewBuilder,

  // Application
  gameBroadcaster,
  gameService,
  lobbyService,

  // Transport
  gameRoutes,
  wsRouter,
};

