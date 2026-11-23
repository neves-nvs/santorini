/**
 * Composition Root
 *
 * Single place where all services are instantiated and wired together.
 * This ensures each service has exactly one instance and proper dependencies.
 *
 * Layer hierarchy:
 *   Infrastructure → Domain → Application → Transport
 */

import { db } from "./database.ts";
import { GameBroadcaster } from "./game/application/GameBroadcaster.ts";
import { GameService } from "./game/application/GameService.ts";
import { GameViewBuilder } from "./game/application/GameViewBuilder.ts";
import { LobbyService } from "./game/application/LobbyService.ts";
import { connectionManager } from "./game/infra/ConnectionManager.ts";
import { GameRepositoryDb } from "./game/infra/GameRepositoryDb.ts";
import { createGameRoutes } from "./game/transport/GameHttpController.ts";
import { WsRouter } from "./websockets/WsRouter.ts";

// Infrastructure
const gameRepository = new GameRepositoryDb(db);

// Domain
const gameViewBuilder = new GameViewBuilder();

// Application
const gameBroadcaster = new GameBroadcaster(
  gameViewBuilder,
  connectionManager,
  (userIds) => gameRepository.findUsernames(userIds),
);
const gameService = new GameService(gameRepository, gameViewBuilder, gameBroadcaster);
const lobbyService = new LobbyService(gameRepository);

// Transport
const wsRouter = new WsRouter(gameService, connectionManager);
const gameRoutes = createGameRoutes(gameService, lobbyService);

export {
  // Infrastructure
  gameRepository,
  connectionManager,

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
