import { NextFunction, Request, Response, Router } from "express";
import { authenticate, getUser } from "../../auth/authController.ts";
import { getHttpStatus, getUserMessage } from "../../errors/GameErrors.ts";

import { Game } from "../domain/Game.ts";
import { GameBroadcaster } from "../application/GameBroadcaster.ts";
import { GameService } from "../application/GameService.ts";
import { LobbyService } from "../application/LobbyService.ts";
import logger from "../../logger.ts";

// Convert Game domain object to DTO for API responses
function gameToDto(game: Game) {
  return {
    id: game.id,
    creatorId: game.creatorId,
    maxPlayers: game.maxPlayers,
    status: game.status,
    phase: game.phase,
    currentPlayerId: game.currentPlayerId,
    turnNumber: game.turnNumber,
    version: game.version,
    playerCount: game.players.size,
    players: Array.from(game.players.values()).map((p) => ({
      id: p.id,
      userId: p.userId,
      seat: p.seat,
      status: p.status,
      isReady: p.isReady,
    })),
    createdAt: game.createdAt,
    startedAt: game.startedAt,
    finishedAt: game.finishedAt,
  };
}

export function createGameRoutes(
  gameService: GameService,
  lobbyService: LobbyService,
  gameBroadcaster: GameBroadcaster,
): Router {
  const router = Router();

  router.get("/", authenticate, async (_req, res) => {
    const games = await lobbyService.findAvailableGames();
    res.json(games.map(gameToDto));
  });

  // Get games where the current user is a player
  router.get("/my", authenticate, async (req, res) => {
    const userId = getUser(req).id;
    const games = await lobbyService.findMyGames(userId);
    res.json(games.map(gameToDto));
  });

  router.post("/", authenticate, async (req, res) => {
    const userId = getUser(req).id;
    const { maxPlayers = 2 } = req.body;
    const game = await lobbyService.createGame(userId, maxPlayers);
    await gameService.addPlayer(game.id, userId);
    res.json({ gameId: game.id });
  });

  router.get("/:gameId", authenticate, async (req, res) => {
    const userId = getUser(req).id;
    const gameId = parseInt(String(req.params.gameId));
    const gameView = await gameService.getGameStateForPlayer(gameId, userId);
    res.json(gameView);
  });

  router.post("/:gameId/join", authenticate, async (req, res) => {
    const userId = getUser(req).id;
    const gameId = parseInt(String(req.params.gameId));
    const game = await lobbyService.joinGame(gameId, userId);
    await gameBroadcaster.broadcastGameUpdate(game, []);
    res.json({ success: true });
  });

  router.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    logger.error("Games route failed", { method: req.method, route: req.route?.path, error });
    res.status(getHttpStatus(error)).json({ error: getUserMessage(error) });
  });

  return router;
}
