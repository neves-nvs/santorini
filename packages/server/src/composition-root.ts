/**
 * Composition Root
 *
 * Single place where all services are instantiated and wired together.
 * This ensures each service has exactly one instance and proper dependencies.
 *
 * Layer hierarchy:
 *   Infrastructure → Domain → Application → Transport
 */

import { GameBroadcaster } from "./game/application/GameBroadcaster.ts";
import { GameRepositoryDb } from "./game/infra/GameRepositoryDb.ts";
import { GameService } from "./game/application/GameService.ts";
import { GameViewBuilder } from "./game/domain/GameViewBuilder.ts";
import { LobbyService } from "./game/application/LobbyService.ts";
import { WsRouter } from "./websockets/WsRouter.ts";
import { createGameRoutes } from "./game/transport/GameHttpController.ts";
import { db } from "./database.ts";
import { webSocketConnectionManager } from "./game/infra/WebSocketConnectionManager.ts";

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
