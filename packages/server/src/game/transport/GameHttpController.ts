import { Response, Router } from 'express';
import { authenticate, getUser } from '../../auth/authController';
import { getHttpStatus, getUserMessage } from '../../errors/GameErrors';

import { Game } from '../domain/Game';
import { GameBroadcaster } from '../application/GameBroadcaster';
import { GameService } from '../application/GameService';
import { LobbyService } from '../application/LobbyService';
import { db } from '../../database';
import logger from '../../logger';

// Batch fetch usernames by IDs
async function getUsernameMap(userIds: number[]): Promise<Map<number, string>> {
  if (userIds.length === 0) return new Map();

  const users = await db
    .selectFrom('users')
    .where('id', 'in', userIds)
    .select(['id', 'username'])
    .execute();

  return new Map(users.map(u => [u.id, u.username]));
}

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
    players: Array.from(game.players.values()).map(p => ({
      id: p.id,
      userId: p.userId,
      seat: p.seat,
      status: p.status,
      isReady: p.isReady
    })),
    createdAt: game.createdAt,
    startedAt: game.startedAt,
    finishedAt: game.finishedAt
  };
}

export function createGameRoutes(
  gameService: GameService,
  lobbyService: LobbyService,
  gameBroadcaster: GameBroadcaster
): Router {
  const router = Router();

  router.get('/', authenticate, async (_req, res) => {
    try {
      const games = await lobbyService.findAvailableGames();

      // Batch fetch creator names
      const creatorIds = [...new Set(games.map(g => g.creatorId))];
      const usernameMap = await getUsernameMap(creatorIds);

      const gamesWithCreatorNames = games.map(game => ({
        ...gameToDto(game),
        creatorName: usernameMap.get(game.creatorId) ?? 'Unknown'
      }));

      res.json(gamesWithCreatorNames);
    } catch (error) {
      handleError(res, error, 'Error getting games');
    }
  });

  // Get games where the current user is a player
  router.get('/my', authenticate, async (req, res) => {
    try {
      const userId = getUser(req).id;
      const games = await lobbyService.findMyGames(userId);

      // Batch fetch creator names
      const creatorIds = [...new Set(games.map(g => g.creatorId))];
      const usernameMap = await getUsernameMap(creatorIds);

      const gamesWithCreatorNames = games.map(game => ({
        ...gameToDto(game),
        creatorName: usernameMap.get(game.creatorId) ?? 'Unknown'
      }));

      res.json(gamesWithCreatorNames);
    } catch (error) {
      handleError(res, error, 'Error getting my games');
    }
  });

  router.post('/', authenticate, async (req, res) => {
    try {
      const userId = getUser(req).id;
      const { maxPlayers = 2 } = req.body;
      const game = await lobbyService.createGame(userId, maxPlayers);
      await gameService.addPlayer(game.id, userId);
      res.json({ gameId: game.id });
    } catch (error) {
      handleError(res, error, 'Error creating game');
    }
  });

  router.get('/:gameId', authenticate, async (req, res) => {
    try {
      const userId = getUser(req).id;
      const gameId = parseInt(req.params.gameId);
      const gameView = await gameService.getGameStateForPlayer(gameId, userId);
      res.json(gameView);
    } catch (error) {
      handleError(res, error, 'Error getting game state');
    }
  });

  router.post('/:gameId/join', authenticate, async (req, res) => {
    try {
      const userId = getUser(req).id;
      const gameId = parseInt(req.params.gameId);
      const game = await lobbyService.joinGame(gameId, userId);
      await gameBroadcaster.broadcastGameUpdate(game, []);
      res.json({ success: true });
    } catch (error) {
      handleError(res, error, 'Error joining game');
    }
  });

  return router;
}

function handleError(res: Response, error: unknown, context: string): void {
  logger.error(`${context}:`, error);
  res.status(getHttpStatus(error)).json({ error: getUserMessage(error) });
}
