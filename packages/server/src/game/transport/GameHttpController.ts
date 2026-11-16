import {
  CreateGameRequest,
  CreateGameResponse,
  GameErrorResponse,
  GameSummary,
  JoinGameResponse,
  PlayerGameView,
  createGamePayloadSchema,
  gameIdSchema,
} from "@santorini/shared";
import { GameError, getHttpStatus, getUserMessage } from "../../errors/GameErrors.ts";
import { NextFunction, Request, Response, Router } from "express";
import { authenticate, getUser } from "../../auth/authController.ts";

import { Game } from "../domain/Game.ts";
import { GameBroadcaster } from "../application/GameBroadcaster.ts";
import { GameService } from "../application/GameService.ts";
import { LobbyService } from "../application/LobbyService.ts";
import logger from "../../logger.ts";

function parseGameId(raw: unknown): number {
  const parsed = gameIdSchema.safeParse(Number(raw));
  if (!parsed.success) throw new GameError("Game ID must be a positive whole number");
  return parsed.data;
}

function parseCreateGameBody(body: unknown) {
  const parsed = createGamePayloadSchema.safeParse(body);
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    throw new GameError(`${issue.path.join(".") || "body"}: ${issue.message}`);
  }
  return parsed.data;
}

function gameToDto(game: Game): GameSummary {
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
    createdAt: game.createdAt.toISOString(),
    startedAt: game.startedAt?.toISOString() ?? null,
    finishedAt: game.finishedAt?.toISOString() ?? null,
  };
}

export function createGameRoutes(
  gameService: GameService,
  lobbyService: LobbyService,
  gameBroadcaster: GameBroadcaster,
): Router {
  const router = Router();

  type NoParams = Record<string, string>;
  type GameParams = { gameId: string };

  router.get<NoParams, GameSummary[]>("/", authenticate, async (_req, res) => {
    const games = await lobbyService.findAvailableGames();
    res.json(games.map(gameToDto));
  });

  // Get games where the current user is a player
  router.get<NoParams, GameSummary[]>("/my", authenticate, async (req, res) => {
    const userId = getUser(req).id;
    const games = await lobbyService.findMyGames(userId);
    res.json(games.map(gameToDto));
  });

  router.post<NoParams, CreateGameResponse, CreateGameRequest>("/", authenticate, async (req, res) => {
    const userId = getUser(req).id;
    const { maxPlayers } = parseCreateGameBody(req.body);
    const game = await lobbyService.createGame(userId, maxPlayers);
    await gameService.addPlayer(game.id, userId);
    res.json({ gameId: game.id });
  });

  router.get<GameParams, PlayerGameView>("/:gameId", authenticate, async (req, res) => {
    const userId = getUser(req).id;
    const gameId = parseGameId(req.params.gameId);
    const gameView = await gameService.getGameStateForPlayer(gameId, userId);
    res.json(gameView);
  });

  router.post<GameParams, JoinGameResponse>("/:gameId/join", authenticate, async (req, res) => {
    const userId = getUser(req).id;
    const gameId = parseGameId(req.params.gameId);
    const game = await lobbyService.joinGame(gameId, userId);
    await gameBroadcaster.broadcastGameUpdate(game, []);
    res.json({ success: true });
  });

  router.use((error: unknown, req: Request, res: Response<GameErrorResponse>, _next: NextFunction) => {
    logger.error("Games route failed", { method: req.method, route: req.route?.path, error });
    res.status(getHttpStatus(error)).json({ error: getUserMessage(error) });
  });

  return router;
}
