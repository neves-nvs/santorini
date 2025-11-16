import { findGameById, findPlayersByGameId, updateGame } from "./gameRepository";
import { executeMove, getAvailablePlays } from "./turnManager";
import * as gameSession from "./gameSession";
import * as broadcastService from "./broadcastService";
import logger from "../logger";

/**
 * Service responsible for processing game actions
 * Contains business logic for moves, ready status, game flow
 */

export interface MoveResult {
  success: boolean;
  error?: string;
}

/**
 * Process a player move
 */
export async function processMove(gameId: number, userId: number, move: any): Promise<MoveResult> {
  try {
    // Get current game state
    const currentGame = await findGameById(gameId);
    if (!currentGame) {
      return { success: false, error: "Game not found" };
    }

    logger.info(`Current game state: id=${currentGame.id}, status=${currentGame.game_status}, phase=${currentGame.game_phase}, current_player_id=${currentGame.current_player_id}`);

    // Handle case where current_player_id is null (legacy games)
    if (currentGame.current_player_id === null && currentGame.game_status === 'in-progress' && currentGame.game_phase === 'placing') {
      logger.warn(`Game ${gameId} has null current_player_id, setting current player to ${userId}`);
      await updateGame(gameId, { current_player_id: userId });
    }

    // Validate it's the player's turn
    if (currentGame.current_player_id !== userId) {
      return { success: false, error: `Not your turn. Current player: ${currentGame.current_player_id}` };
    }

    // Process the move based on type
    let moveResult;
    if (move.type === 'place_worker') {
      moveResult = await processPlaceWorkerMove(gameId, userId, move);
    } else if (move.type === 'move_worker') {
      moveResult = await processMoveWorkerMove(gameId, userId, move);
    } else if (move.type === 'build_block' || move.type === 'build_dome') {
      moveResult = await processBuildMove(gameId, userId, move);
    } else {
      return { success: false, error: "Invalid move type or missing required data" };
    }

    if (!moveResult.success) {
      return moveResult;
    }

    // Broadcast updated game state
    await broadcastGameUpdate(gameId);

    return { success: true };

  } catch (error) {
    logger.error(`Error processing move:`, error);
    return { success: false, error: "Failed to process move" };
  }
}

async function processPlaceWorkerMove(gameId: number, userId: number, move: any): Promise<MoveResult> {
  try {
    const result = await executeMove(gameId, userId, {
      type: 'place_worker',
      position: move.position
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Move execution failed' };
    }

    logger.info(`✅ Worker successfully placed at (${move.position.x}, ${move.position.y}) by user ${userId} in game ${gameId}`);
    return { success: true };

  } catch (error) {
    logger.error(`Error in processPlaceWorkerMove:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function processMoveWorkerMove(gameId: number, userId: number, move: any): Promise<MoveResult> {
  try {
    logger.info(`Processing move_worker: from (${move.fromPosition.x}, ${move.fromPosition.y}) to (${move.position.x}, ${move.position.y})`);

    const moveResult = await executeMove(gameId, userId, {
      type: 'move_worker',
      workerId: move.workerId,
      fromPosition: move.fromPosition,
      position: move.position
    });

    if (!moveResult.success) {
      return { success: false, error: moveResult.error || 'Unknown error' };
    }

    return { success: true };

  } catch (error) {
    logger.error(`Error in processMoveWorkerMove:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function processBuildMove(gameId: number, userId: number, move: any): Promise<MoveResult> {
  try {
    logger.info(`Processing ${move.type} at (${move.position.x}, ${move.position.y})`);

    const moveToExecute = {
      ...move,
      playerId: userId
    };

    const buildResult = await executeMove(gameId, userId, moveToExecute);

    if (!buildResult.success) {
      return { success: false, error: buildResult.error || 'Unknown error' };
    }

    return { success: true };

  } catch (error) {
    logger.error(`Error in processBuildMove:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Broadcast game update after a move
 */
async function broadcastGameUpdate(gameId: number): Promise<void> {
  const updatedGame = await findGameById(gameId);
  if (!updatedGame) return;

  logger.info(`Broadcasting updated game state after move in game ${gameId}`);

  // Send SAME game state to ALL players
  await broadcastService.broadcastGameState(gameId, updatedGame);

  // Send available moves ONLY to current player
  if (updatedGame.current_player_id) {
    logger.info(`🎯 Getting available plays for game ${gameId}, phase: ${updatedGame.game_phase}, current player: ${updatedGame.current_player_id}`);

    const availablePlays = await getAvailablePlays(gameId);
    logger.info(`🎯 Generated ${availablePlays.length} available plays for current player ${updatedGame.current_player_id} in ${updatedGame.game_phase} phase`);

    if (availablePlays.length > 0) {
      await broadcastService.sendAvailableMovesToPlayer(gameId, updatedGame.current_player_id, availablePlays);
    } else {
      logger.warn(`⚠️ No available plays generated for player ${updatedGame.current_player_id} in ${updatedGame.game_phase} phase`);
    }
  }
}

/**
 * Handle player ready status change
 */
export async function setPlayerReady(gameId: number, userId: number, isReady: boolean): Promise<MoveResult> {
  try {
    // Set player ready status
    gameSession.setPlayerReady(gameId, userId, isReady);

    // Get updated game state and broadcast to all players
    const updatedGame = await findGameById(gameId);
    const playersReadyStatus = await gameSession.getPlayersReadyStatus(gameId);

    logger.info(`Broadcasting ready status update for game ${gameId}`);

    // Broadcast game state with ready status
    await broadcastService.broadcastGameStateWithReadyStatus(gameId, updatedGame, playersReadyStatus);

    // Check if all players are ready and game should start
    if (await gameSession.areAllPlayersReady(gameId) && updatedGame?.game_status === 'waiting') {
      await startGame(gameId);
    }

    return { success: true };

  } catch (error) {
    logger.error(`Error setting ready status:`, error);
    return { success: false, error: "Failed to set ready status" };
  }
}

/**
 * Start a game when all players are ready
 */
async function startGame(gameId: number): Promise<void> {
  logger.info(`All players ready in game ${gameId}, starting game!`);

  // Get all players for random selection
  const playerIds = await findPlayersByGameId(gameId);

  // Pick a random starting player
  const randomIndex = Math.floor(Math.random() * playerIds.length);
  const startingPlayerId = playerIds[randomIndex];

  logger.info(`Game ${gameId} - Randomly selected starting player: ${startingPlayerId} from players: [${playerIds.join(', ')}]`);

  // Update game to in-progress with starting player
  await updateGame(gameId, {
    game_status: 'in-progress',
    game_phase: 'placing',
    current_player_id: startingPlayerId
  });

  // Broadcast the updated game state
  const updatedGame = await findGameById(gameId);
  await broadcastService.broadcastGameState(gameId, updatedGame);

  logger.info(`Game ${gameId} started successfully with player ${startingPlayerId}`);
}
