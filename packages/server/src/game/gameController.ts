import * as gameRepository from "./gameRepository";
import * as gameService from "./gameService";

import { body, param } from "express-validator";
import { checkValidation, validateUUIDParam } from "../middlewares/middleware";

import { Router } from "express";
import { User } from "../model";
import { authenticate } from "../auth/authController";

import logger from "../logger";

const router = Router();

/**
 * Generate available plays for the placing phase
 * During placing phase, players can place workers on any empty cell
 */
function generatePlacingPhaseAvailablePlays(gameId: number) {
  // For now, return all empty positions on a 5x5 board
  // TODO: Check actual board state and exclude occupied positions
  const availablePlays = [];

  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      availablePlays.push({
        type: "place_worker",
        position: { x, y }
      });
    }
  }

  logger.info(`Generated ${availablePlays.length} available plays for placing phase in game ${gameId}`);
  return availablePlays;
}

/* -------------------------------------------------------------------------- */
/*                                      /                                     */
/* -------------------------------------------------------------------------- */

router.get("/", authenticate, async (req, res) => {
  try {
    const games = await gameRepository.getAllGames();

    // Fetch player counts for all games in parallel
    const gamesWithPlayerCounts = await Promise.all(
      games.map(async (game) => {
        try {
          const playerIds = await gameRepository.findPlayersByGameId(game.id);
          return {
            ...game,
            current_players: playerIds.length,
            players: playerIds
          };
        } catch (error) {
          logger.error(`Failed to get players for game ${game.id}:`, error);
          return {
            ...game,
            current_players: 0,
            players: []
          };
        }
      })
    );

    res.send(gamesWithPlayerCounts);
  } catch (error) {
    logger.error("Failed to get games with player counts:", error);
    res.status(500).json({ message: "Failed to fetch games" });
  }
});

/* -------------------------------------------------------------------------- */
/*                                 /:gameId                                   */
/* -------------------------------------------------------------------------- */

router.get("/:gameId", authenticate, validateUUIDParam("gameId"), checkValidation, async (req, res) => {
  const gameId = parseInt(req.params.gameId);
  const user = req.user as User;

  try {
    // Get the game
    const game = await gameRepository.findGameById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Get players in the game
    const players = await gameRepository.findPlayersByGameId(gameId);

    // Get players ready status
    const gameSession = await import("./gameSession");
    const playersReadyStatus = gameSession.getPlayersReadyStatus(gameId);

    // Get board state if game is in progress
    let boardState = null;
    if (game.game_status === 'in-progress') {
      // Import the getGameBoard function from messageHandler
      const { getGameBoard } = await import("../websockets/messageHandler");
      boardState = await getGameBoard(gameId);
    }

    // Return complete game state
    const gameResponse = {
      ...game,
      players: players,
      playersReadyStatus: playersReadyStatus,
      board: boardState
    };

    logger.info(`Fetched game ${gameId} for user ${user.username} with board state: ${!!boardState}`);
    res.json(gameResponse);

  } catch (error) {
    logger.error(`Failed to fetch game ${gameId}:`, error);
    res.status(500).json({ message: "Failed to fetch game" });
  }
});

router.post(
  "/",
  authenticate,
  body("player_count").isInt({ min: 2, max: 4 }).withMessage("Amount of players must be between 2 and 4"),
  checkValidation,
  async (req, res, next) => {
    const { player_count } = req.body as { player_count: number | undefined };
    const user = req.user as User;

    try {
      const result = await gameService.createGame(user, player_count);
      res.status(201).send(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Failed to create game") {
        logger.error("Failed to create game", error);
        return res.status(400).send({ message: "Failed to create game" });
      }
      logger.error("Failed to create game", error);
      next(error);
    }
  },
);

/* -------------------------------------------------------------------------- */
/*                              /:gameId/players                              */
/* -------------------------------------------------------------------------- */

router.get(
  "/:gameId/players",
  authenticate,
  param("gameId").isInt().withMessage("Game ID must be an integer"),
  checkValidation,
  async (req, res) => {
    const gameId = parseInt(req.params.gameId);

    try {
      const playersInGame = await gameRepository.findPlayersByGameId(gameId);
      res.status(200).json(playersInGame);
    } catch (err) {
      logger.error("Failed to get players for game", err);
      res.status(500).json({ message: "Failed to get players for game" });
    }
  },
);

// HTTP join endpoint commented out - players should join via WebSocket join_game message
// router.post(
//   "/:gameId/players",
//   authenticate,
//   param("gameId").isInt().withMessage("Game ID must be an integer"),
//   checkValidation,
//   async (req, res, next) => {
//     const gameId = parseInt(req.params.gameId);
//     const user = req.user as User;

//     try {
//       await gameService.addPlayerToGame(gameId, user);

//       const playersInGame = await gameRepository.findPlayersByGameId(gameId);
//       broadcastUpdate(gameId, { type: "players_in_game", payload: playersInGame });

//       res.status(201);

//       const readyToStart = await gameService.isReadyToStart(gameId);
//       return readyToStart ? res.send({ message: "Ready to Start" }) : res.send();
//     } catch (err) {
//       if (!(err instanceof Error)) {
//         next(err);
//       }

//       const error = err as Error;
//       if (error.message === "Game not found") {
//         logger.error("Game not found", error);
//         return res.status(400).json({ message: "Game not found" });
//       } else if (error.message.includes("duplicate key value violates unique constraint")) {
//         logger.error("Player already in game", error);
//         return res.status(400).json({ message: "Player already in game" });
//       } else if (error.message === "Game is full") {
//         logger.error("Game is full", error);
//         return res.status(400).json({ message: "Game full" });
//       }

//       logger.error("Failed to add player to game", error);
//       return res.status(400).json({ message: "Failed to add player to game" });
//     }
//   },
// );

/* -------------------------------------------------------------------------- */
/*                               /:gameId/plays                               */
/* -------------------------------------------------------------------------- */

router.get("/:gameId/plays", authenticate, validateUUIDParam("gameId"), checkValidation, async (req, res) => {
  const gameId = parseInt(req.params.gameId);

  const user = req.user as User;

  const game = await gameRepository.findGameById(gameId);
  if (!game) {
    return res.status(400).send("Game not found");
  }

  // res.send(gameService.getPlays(user.username));

  res.status(501).send("Get plays not implemented");
});

router.post("/:gameId/ready", authenticate, async (req, res) => {
  const gameId = parseInt(req.params.gameId);
  const user = req.user as User;
  const { isReady } = req.body;

  try {
    const game = await gameRepository.findGameById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Set player ready status using in-memory tracking
    const gameSession = await import("./gameSession");
    gameSession.setPlayerReady(gameId, user.id, isReady);

    // Check if all players are ready
    const allReady = gameSession.areAllPlayersReady(gameId);
    const playersStatus = gameSession.getPlayersReadyStatus(gameId);
    const connectedPlayersCount = gameSession.getConnectedPlayersCount(gameId);

    logger.info(`Game ${gameId} ready check: allReady=${allReady}, game_status=${game.game_status}, connectedPlayers=${connectedPlayersCount}, playersStatus=${JSON.stringify(playersStatus)}`);
    logger.info(`Game ${gameId} debug - playersStatus.length=${playersStatus.length}, playersStatus.filter(ready)=${playersStatus.filter(p => p.isReady).length}`);

    if (allReady && game.game_status === "ready") {
      // Get all players for random selection
      const playerIds = await gameRepository.findPlayersByGameId(gameId);

      // Pick a random starting player
      const randomIndex = Math.floor(Math.random() * playerIds.length);
      const startingPlayerId = playerIds[randomIndex];

      logger.info(`Game ${gameId} - Randomly selected starting player: ${startingPlayerId} from players: [${playerIds.join(', ')}]`);

      // Start the game - move to in-progress status with placing phase
      await gameRepository.updateGame(gameId, {
        game_status: "in-progress",
        game_phase: "placing",
        current_player_id: startingPlayerId
      });

      // Clear ready status since game is starting
      gameSession.clearPlayerReadyStatus(gameId);

      // Broadcast game start
      logger.info(`All players ready! Starting game ${gameId} - moving to placing phase with player ${startingPlayerId} starting`);
      gameSession.broadcastUpdate(gameId, { type: "game_start" });

      // Send updated game state
      const updatedGame = await gameRepository.findGameById(gameId);
      const players = await gameRepository.findPlayersByGameId(gameId);
      const playersReadyStatus = gameSession.getPlayersReadyStatus(gameId);
      logger.info(`Broadcasting game_state_update for game ${gameId} with status: ${updatedGame?.game_status}`);
      gameSession.broadcastUpdate(gameId, {
        type: "game_state_update",
        payload: {
          ...updatedGame,
          players: players,
          playersReadyStatus: playersReadyStatus
        }
      });

      // Send available plays to the current player for placing phase
      if (updatedGame?.game_phase === "placing" && updatedGame?.current_player_id) {
        const availablePlays = generatePlacingPhaseAvailablePlays(gameId);
        logger.info(`Sending available_plays to player ${updatedGame.current_player_id} for placing phase:`, availablePlays);

        gameSession.sendToPlayer(gameId, updatedGame.current_player_id, {
          type: "available_plays",
          payload: availablePlays
        });
      }
    } else {
      // Broadcast ready status update
      logger.info(`Broadcasting player_ready_status for game ${gameId}. Ready players: ${playersStatus.length}`);
      gameSession.broadcastUpdate(gameId, {
        type: "player_ready_status",
        payload: playersStatus
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Failed to set player ready status", error);
    res.status(500).json({ message: "Failed to set ready status" });
  }
});

router.post("/:gameId/plays", authenticate, validateUUIDParam("gameId"), checkValidation, async (req, res) => {
  const gameId = parseInt(req.params.gameId);

  const { play } = req.body;
  if (!play) {
    return res.status(400).send("Play required");
  }

  const game = await gameRepository.findGameById(gameId);
  if (!game) {
    return res.status(400).send("Game not found");
  }

  // gameService.applyPlay(gameId, user.username, play);

  return res.status(501).send("Post plays not implemented");
  // game.addPlay(player.getUsername(), play);
  // res.status(201).send();
});

export default router;
