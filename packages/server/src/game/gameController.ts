import * as gameRepository from "./gameRepository";
import * as gameService from "./gameService";

import { body, param } from "express-validator";
import { checkValidation, validateUUIDParam, validateIntParam } from "../middlewares/middleware";

import { Router } from "express";
import { User } from "../model";
import { authenticate } from "../auth/authController";
import { GameEngine, GameContext } from "./gameEngine";

import logger from "../logger";

const router = Router();

// Create a global game engine instance
// TODO: In production, this should be managed per-game or injected
const gameEngine = new GameEngine();

/**
 * Generate available plays for the placing phase
 * Now uses the new GameEngine with hook system for extensibility
 */
export async function generatePlacingPhaseAvailablePlays(gameId: number, providedBoardState?: any) {
  let boardState;
  let game;

  if (providedBoardState !== undefined) {
    // Use provided board state (for testing) - can be null for fallback logic
    boardState = providedBoardState;
    game = { current_player_id: 1, player_count: 2 }; // Default for tests
  } else {
    // Load board state from database
    const { loadBoardState } = require('./boardState');
    boardState = await loadBoardState(gameId);

    // Get game info for player count
    game = await gameRepository.findGameById(gameId);
  }

  const context: GameContext = {
    gameId,
    currentPhase: 'placing',
    currentPlayerId: game?.current_player_id || undefined,
    boardState,
    playerCount: game?.player_count
  };

  const availablePlays = gameEngine.generateAvailablePlays(context);

  logger.info(`Generated ${availablePlays.length} available plays for placing phase in game ${gameId} (${25 - availablePlays.length} positions occupied)`);
  return availablePlays;
}

/**
 * Generate available plays for the moving phase
 * Workers can move to adjacent cells with height restrictions
 */
export async function generateMovingPhaseAvailablePlays(gameId: number, currentPlayerId: number, providedBoardState?: any) {
  let boardState;
  let game;

  if (providedBoardState !== undefined) {
    // Use provided board state (for testing)
    boardState = providedBoardState;
    game = { current_player_id: currentPlayerId, player_count: 2 }; // Default for tests
  } else {
    // Load board state from database
    const { loadBoardState } = require('./boardState');
    boardState = await loadBoardState(gameId);

    // Get game info
    game = await gameRepository.findGameById(gameId);
  }

  const context: GameContext = {
    gameId,
    currentPhase: 'moving',
    currentPlayerId: currentPlayerId,
    boardState,
    playerCount: game?.player_count
  };

  const availablePlays = gameEngine.generateAvailablePlays(context);

  logger.info(`Generated ${availablePlays.length} available moves for player ${currentPlayerId} in game ${gameId}`);
  return availablePlays;
}

/**
 * Generate available plays for the building phase
 * Workers can build blocks or domes on adjacent cells
 */
export async function generateBuildingPhaseAvailablePlays(gameId: number, currentPlayerId: number, providedBoardState?: any) {
  let boardState;
  let game;
  let turnState;

  if (providedBoardState !== undefined) {
    // Use provided board state (for testing)
    boardState = providedBoardState;
    game = { current_player_id: currentPlayerId, player_count: 2 }; // Default for tests
    turnState = null; // No turn state in tests
  } else {
    // Load board state from database
    const { loadBoardState } = require('./boardState');
    boardState = await loadBoardState(gameId);

    // Get game info
    game = await gameRepository.findGameById(gameId);

    // Get turn state to know which worker moved
    const { getCurrentTurnState } = require('./turnManager');
    turnState = await getCurrentTurnState(gameId);

    console.log(`🔧 Turn state debug for game ${gameId}:`, {
      turnState,
      lastMovedWorkerId: turnState?.lastMovedWorkerId,
      lastMovedWorkerPosition: turnState?.lastMovedWorkerPosition,
      currentPhase: turnState?.currentPhase
    });
  }

  const context: GameContext = {
    gameId,
    currentPhase: 'building',
    currentPlayerId: currentPlayerId,
    boardState,
    playerCount: game?.player_count,
    lastMovedWorkerId: turnState?.lastMovedWorkerId,
    lastMovedWorkerPosition: turnState?.lastMovedWorkerPosition
  };

  const availablePlays = gameEngine.generateAvailablePlays(context);

  logger.info(`Generated ${availablePlays.length} available builds for player ${currentPlayerId} in game ${gameId}`);
  return availablePlays;
}

/**
 * Check if a specific move would result in a win
 */
export async function checkWinningMove(gameId: number, fromX: number, fromY: number, toX: number, toY: number, providedBoardState?: any) {
  let boardState;

  if (providedBoardState !== undefined) {
    boardState = providedBoardState;
  } else {
    const { loadBoardState } = require('./boardState');
    boardState = await loadBoardState(gameId);
  }

  const { isWinningMove } = require('./boardState');
  return isWinningMove(boardState, fromX, fromY, toX, toY);
}

/**
 * Check current game state for wins and blocks
 */
export async function checkGameState(gameId: number, providedBoardState?: any) {
  let boardState;
  let game;

  if (providedBoardState !== undefined) {
    boardState = providedBoardState;
    game = { player_count: 2, game_phase: 'moving' }; // Default for tests
  } else {
    const { loadBoardState } = require('./boardState');
    boardState = await loadBoardState(gameId);
    game = await gameRepository.findGameById(gameId);
  }

  const { checkGameWinner } = require('./boardState');

  // Check for winner
  const winner = checkGameWinner(boardState, game?.player_count || 2);
  if (winner) {
    logger.info(`Game ${gameId}: Player ${winner} has won!`);
    return {
      gameOver: true,
      winner,
      reason: 'win_condition'
    };
  }

  // Only check for blocked players during moving/building phases
  // During placing phase, players can't be "blocked" since they're still placing workers
  if (game?.game_phase !== 'placing') {
    logger.info(`Game ${gameId}: Checking for blocked players (phase: ${game?.game_phase})`);

    // Check for blocked players (loss condition)
    for (let playerId = 1; playerId <= (game?.player_count || 2); playerId++) {
      const isBlocked = await checkPlayerBlocked(gameId, playerId, boardState);
      if (isBlocked) {
        // Find the winner (the other player)
        const otherPlayerId = playerId === 1 ? 2 : 1;
        logger.info(`Game ${gameId}: Player ${playerId} is blocked, Player ${otherPlayerId} wins!`);
        return {
          gameOver: true,
          winner: otherPlayerId,
          reason: 'opponent_blocked'
        };
      }
    }
  } else {
    logger.info(`Game ${gameId}: Skipping blocked player check during placing phase`);
  }

  // Game continues
  return {
    gameOver: false,
    winner: null,
    reason: null
  };
}

/**
 * Check if a specific player is blocked (cannot complete a full turn)
 * Uses the game engine to check both move and build availability
 */
export async function checkPlayerBlocked(gameId: number, playerId: number, providedBoardState?: any) {
  let boardState;

  if (providedBoardState !== undefined) {
    boardState = providedBoardState;
  } else {
    const { loadBoardState } = require('./boardState');
    boardState = await loadBoardState(gameId);
  }

  // Check if player can move
  const movingMoves = await generateMovingPhaseAvailablePlays(gameId, playerId, boardState);

  // If no moves available, player is blocked
  if (movingMoves.length === 0) {
    logger.info(`Player ${playerId} in game ${gameId} is blocked - no moves available`);
    return true;
  }

  // Check if player can build after any possible move
  for (const move of movingMoves) {
    if (move.type === 'move_worker' && move.position && move.fromPosition) {
      // Create a temporary board state with the move applied
      const tempBoardState = JSON.parse(JSON.stringify(boardState)); // Deep copy

      // Reconstruct the workers Map (JSON.parse doesn't preserve Maps)
      tempBoardState.workers = new Map();
      for (const [key, value] of boardState.workers.entries()) {
        tempBoardState.workers.set(key, value);
      }

      // Apply the move to temp board state
      const fromX = move.fromPosition.x;
      const fromY = move.fromPosition.y;
      const toX = move.position.x;
      const toY = move.position.y;

      // Remove worker from old position
      tempBoardState.cells[fromX][fromY].worker = undefined;

      // Place worker at new position
      tempBoardState.cells[toX][toY].worker = { playerId, workerId: move.workerId };

      // Update worker tracking
      const workerKey = `${playerId}-${move.workerId}`;
      tempBoardState.workers.set(workerKey, { x: toX, y: toY, playerId });

      // Check if building is possible from the new position
      const buildingMoves = await generateBuildingPhaseAvailablePlays(gameId, playerId, tempBoardState);

      // If this move allows building, player is not blocked
      if (buildingMoves.length > 0) {
        return false;
      }
    }
  }

  // No move allows subsequent building - player is blocked
  logger.info(`Player ${playerId} in game ${gameId} is blocked - can move but cannot build`);
  return true;
}

/**
 * Add a god power to the game engine
 * This allows dynamic addition of game rules
 */
export function addGodPower(godPowerName: string): boolean {
  const { createGodPowerHook } = require('./godPowers');
  const hook = createGodPowerHook(godPowerName);

  if (hook) {
    gameEngine.addHook(hook);
    logger.info(`Added god power: ${godPowerName}`);
    return true;
  }

  logger.warn(`Unknown god power: ${godPowerName}`);
  return false;
}

/**
 * Get the game engine instance (for testing)
 */
export function getGameEngine(): GameEngine {
  return gameEngine;
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

// HTTP join endpoint for testing - normally players join via WebSocket
router.post(
  "/:gameId/players",
  authenticate,
  validateIntParam("gameId"),
  checkValidation,
  async (req, res, next) => {
    const gameId = parseInt(req.params.gameId);
    const user = req.user as User;

    try {
      await gameService.addPlayerToGame(gameId, user);

      const playersInGame = await gameRepository.findPlayersByGameId(gameId);
      // broadcastUpdate(gameId, { type: "players_in_game", payload: playersInGame });

      res.status(201);

      const readyToStart = await gameService.isReadyToStart(gameId);
      return readyToStart ? res.send({ message: "Ready to Start" }) : res.send();
    } catch (err) {
      if (!(err instanceof Error)) {
        next(err);
      }

      const error = err as Error;
      if (error.message === "Game not found") {
        logger.error("Game not found", error);
        return res.status(400).json({ message: "Game not found" });
      } else if (error.message.includes("duplicate key value violates unique constraint")) {
        logger.error("Player already in game", error);
        return res.status(400).json({ message: "Player already in game" });
      } else if (error.message === "Game is full") {
        logger.error("Game is full", error);
        return res.status(400).json({ message: "Game full" });
      }

      logger.error("Failed to add player to game", error);
      return res.status(400).json({ message: "Failed to add player to game" });
    }
  },
);

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

      // Send SAME game state to ALL players
      const updatedGame = await gameRepository.findGameById(gameId);
      logger.info(`Broadcasting game state for game ${gameId} with status: ${updatedGame?.game_status} to all players`);

      // Format game state (same for everyone)
      const messageHandler = await import("../websockets/messageHandler");
      const formattedGameState = await messageHandler.formatGameStateForFrontend(updatedGame, gameId);

      // Broadcast identical game state to ALL players
      gameSession.broadcastUpdate(gameId, {
        type: "game_state_update",
        payload: formattedGameState
      });

      // Send available moves ONLY to current player
      if (updatedGame?.current_player_id) {
        // Use turn manager to get available plays (handles turn state properly)
        const { getAvailablePlays } = await import("./turnManager");
        const availablePlays = await getAvailablePlays(gameId);

        if (availablePlays.length > 0) {
          logger.info(`Sending available_moves to current player ${updatedGame.current_player_id} for ${updatedGame.game_phase} phase:`, availablePlays.length, "moves");

          gameSession.sendToPlayer(gameId, updatedGame.current_player_id, {
            type: "available_moves",
            payload: availablePlays
          });
        } else {
          logger.warn(`No available moves generated for current player ${updatedGame.current_player_id} in game ${gameId}`);
        }
      }

      logger.info(`Game ${gameId} started - consistent game state sent to all players, available moves sent to current player`);

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

/* -------------------------------------------------------------------------- */
/*                              TURN MANAGEMENT ENDPOINTS                     */
/* -------------------------------------------------------------------------- */

/**
 * Get current turn state and available plays
 */
router.get("/:gameId/turn", async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    const { getCurrentTurnState, getAvailablePlays } = require('./turnManager');

    const turnState = await getCurrentTurnState(gameId);
    if (!turnState) {
      return res.status(404).json({ error: "Game not found" });
    }

    const availablePlays = await getAvailablePlays(gameId);

    res.json({
      turnState,
      availablePlays
    });
  } catch (error) {
    logger.error("Error getting turn state:", error);
    res.status(500).json({ error: "Failed to get turn state" });
  }
});

/**
 * Execute a move
 */
router.post("/:gameId/move", async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    const { move } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { executeMove } = require('./turnManager');
    const result = await executeMove(gameId, (user as any).id, move);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    logger.error("Error executing move:", error);
    res.status(500).json({ error: "Failed to execute move" });
  }
});

/**
 * Get complete game state for frontend (game + board + turn + available plays)
 */
router.get("/:gameId/state", authenticate, validateIntParam("gameId"), checkValidation, async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    const user = req.user as User;

    // Get basic game info
    const game = await gameRepository.findGameById(gameId);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // Get players
    const players = await gameRepository.findUsersByGame(gameId);

    // Get turn state
    const { getCurrentTurnState, getAvailablePlays } = require('./turnManager');
    const turnState = await getCurrentTurnState(gameId);
    const availablePlays = await getAvailablePlays(gameId);

    // Get board state
    let boardState = null;
    if (game.game_status === 'in-progress' || game.game_status === 'completed') {
      const { getGameBoard } = await import("../websockets/messageHandler");
      boardState = await getGameBoard(gameId);
    }

    // Convert to frontend format
    const gameState = {
      id: gameId.toString(),
      board: boardState,
      players: players.map((p, index) => ({
        id: p.id.toString(),
        username: p.username,
        color: index === 0 ? 'blue' : 'red',
        workers: [] // Workers are in board state
      })),
      currentPlayer: turnState?.currentPlayerId?.toString() || '',
      phase: mapBackendPhaseToFrontend(game.game_phase, game.game_status),
      winner: game.winner_id?.toString(),

      // Backend fields for compatibility
      user_creator_id: game.user_creator_id,
      player_count: game.player_count,
      game_status: game.game_status,
      game_phase: game.game_phase,
      current_player_id: game.current_player_id,
      winner_id: game.winner_id,
      created_at: game.created_at,
      started_at: game.started_at,
      finished_at: game.finished_at,

      // Turn management
      turnState,
      availablePlays,
      isMyTurn: turnState?.currentPlayerId === user.id
    };

    res.json(gameState);
  } catch (error) {
    logger.error("Error getting complete game state:", error);
    res.status(500).json({ error: "Failed to get game state" });
  }
});

// Helper function to map backend phases to frontend phases
function mapBackendPhaseToFrontend(backendPhase: string | null, gameStatus: string): string {
  if (gameStatus === 'completed') return 'FINISHED';
  if (gameStatus === 'waiting') return 'SETUP';
  if (backendPhase === 'placing') return 'SETUP';
  if (backendPhase === 'moving' || backendPhase === 'building') return 'PLAYING';
  return 'SETUP';
}

export default router;
