import { gameBroadcaster, gameService, lobbyService } from '../../composition-root';
import { getHttpStatus, getUserMessage } from '../../errors/GameErrors';

import { User } from '../../model';
import { authenticate } from '../../auth/authController';
import express from 'express';
import logger from '../../logger';

/**
 * HTTP controller for game operations using clean architecture
 */
export function createGameRouter(): express.Router {
  const router = express.Router();

  /**
   * Create a new game
   */
  router.post("/", authenticate, async (req, res) => {
    try {
      const { maxPlayers = 2 } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = (user as User).id;
      const game = await lobbyService.createGame(userId, maxPlayers);

      // Add creator as first player
      await gameService.addPlayer(game.id, userId);

      res.json({ gameId: game.id });
    } catch (error) {
      logger.error("Error creating game:", error);
      res.status(getHttpStatus(error)).json({ error: getUserMessage(error) });
    }
  });

  /**
   * Join a game
   */
  router.post("/:gameId/join", authenticate, async (req, res) => {
    try {
      const gameId = parseInt(req.params.gameId);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const updatedGame = await lobbyService.joinGame(gameId, (user as User).id);

      // Broadcast game update to all players in the game
      await gameBroadcaster.broadcastGameUpdate(updatedGame, []);

      res.json({ success: true });
    } catch (error) {
      logger.error("Error joining game:", error);
      res.status(getHttpStatus(error)).json({ error: getUserMessage(error) });
    }
  });

  /**
   * Get game state
   */
  router.get("/:gameId", authenticate, async (req, res) => {
    try {
      const gameId = parseInt(req.params.gameId);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const gameView = await gameService.getGameStateForPlayer(gameId, (user as User).id);

      res.json(gameView);
    } catch (error) {
      logger.error("Error getting game state:", error);
      res.status(getHttpStatus(error)).json({ error: getUserMessage(error) });
    }
  });

  /**
   * Execute a move
   */
  router.post("/:gameId/move", authenticate, async (req, res) => {
    try {
      const gameId = parseInt(req.params.gameId);
      const { move } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const result = await gameService.applyMove(gameId, (user as User).id, move);

      res.json({
        success: true,
        game: result.game,
        events: result.events,
        view: result.view
      });
    } catch (error) {
      logger.error("Error executing move:", error);
      res.status(getHttpStatus(error)).json({ error: getUserMessage(error) });
    }
  });

  /**
   * Get available games
   */
  router.get("/", authenticate, async (_req, res) => {
    try {
      const games = await lobbyService.findAvailableGames();

      // Convert Game domain objects to API-friendly format
      const gamesDto = games.map(game => ({
        id: game.id,
        creatorId: game.creatorId,
        maxPlayers: game.maxPlayers,
        status: game.status,
        phase: game.phase,
        currentPlayerId: game.currentPlayerId,
        turnNumber: game.turnNumber,
        version: game.version,
        playerCount: game.players.size,
        players: Array.from(game.players.values()).map(player => ({
          id: player.id,
          userId: player.userId,
          seat: player.seat,
          status: player.status,
          isReady: player.isReady
        })),
        createdAt: game.createdAt,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt
      }));

      res.json(gamesDto);
    } catch (error) {
      logger.error("Error getting games:", error);
      res.status(getHttpStatus(error)).json({ error: getUserMessage(error) });
    }
  });

  return router;
}
