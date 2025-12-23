/**
 * Composition Root
 *
 * Single place where all services are instantiated and wired together.
 * This ensures each service has exactly one instance and proper dependencies.
 */

import { GameBroadcaster } from './game/application/GameBroadcaster';
import { GameRepositoryDb } from './game/infra/GameRepositoryDb';
import { GameService } from './game/application/GameService';
import { GameViewBuilder } from './game/domain/GameViewBuilder';
import { LobbyService } from './game/application/LobbyService';
import { db } from './database';
import { webSocketConnectionManager } from './game/infra/WebSocketConnectionManager';

// Infrastructure layer - single instances
const gameRepository = new GameRepositoryDb(db);

// Domain services
const gameViewBuilder = new GameViewBuilder();

// Application services - wired with shared dependencies
const gameBroadcaster = new GameBroadcaster(gameViewBuilder, webSocketConnectionManager);
const gameService = new GameService(gameRepository, gameViewBuilder, gameBroadcaster);
const lobbyService = new LobbyService(gameRepository);

export {
  // Infrastructure
  gameRepository,
  webSocketConnectionManager,

  // Domain services
  gameViewBuilder,

  // Application services
  gameBroadcaster,
  gameService,
  lobbyService
};

