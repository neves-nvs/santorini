import { GameContext } from './gameEngine';
import { BoardState, loadBoardState, saveBoardState } from './boardState';
import * as gameRepository from './gameRepository';
import { 
  generatePlacingPhaseAvailablePlays,
  generateMovingPhaseAvailablePlays, 
  generateBuildingPhaseAvailablePlays,
  checkGameState
} from './gameController';
import logger from '../logger';

export interface TurnState {
  gameId: number;
  currentPlayerId: number;
  currentPhase: 'placing' | 'moving' | 'building';
  turnNumber: number;
  placingTurnsCompleted: number;
  isGameOver: boolean;
  winner?: number;
  winReason?: string;
  lastMovedWorkerId?: number;
  lastMovedWorkerPosition?: { x: number; y: number };
}

export interface MoveResult {
  success: boolean;
  error?: string;
  newTurnState?: TurnState;
  gameOver?: boolean;
  winner?: number;
  availablePlays?: any[];
  isWin?: boolean;
  lastMovedWorkerId?: number;
  lastMovedWorkerPosition?: { x: number; y: number };
}

/**
 * Get current turn state for a game
 */
export async function getCurrentTurnState(gameId: number): Promise<TurnState | null> {
  try {
    const game = await gameRepository.findGameById(gameId);
    if (!game) {
      return null;
    }

    return {
      gameId,
      currentPlayerId: game.current_player_id || 1,
      currentPhase: (game.game_phase as 'placing' | 'moving' | 'building') || 'placing',
      turnNumber: game.turn_number || 1,
      placingTurnsCompleted: game.placing_turns_completed || 0,
      isGameOver: game.game_status === 'completed',
      winner: game.winner_id || undefined,
      winReason: game.win_reason || undefined,
      lastMovedWorkerId: game.last_moved_worker_id || undefined,
      lastMovedWorkerPosition: (game.last_moved_worker_x !== null && game.last_moved_worker_y !== null)
        ? { x: game.last_moved_worker_x, y: game.last_moved_worker_y }
        : undefined
    };
  } catch (error) {
    logger.error(`Failed to get turn state for game ${gameId}:`, error);
    return null;
  }
}

/**
 * Get available plays for current turn state
 * If no plays are available during moving or building phase, the player is blocked and loses
 */
export async function getAvailablePlays(gameId: number): Promise<any[]> {
  const turnState = await getCurrentTurnState(gameId);
  if (!turnState || turnState.isGameOver) {
    return [];
  }

  try {
    let availablePlays: any[] = [];

    switch (turnState.currentPhase) {
      case 'placing':
        availablePlays = await generatePlacingPhaseAvailablePlays(gameId);
        break;

      case 'moving':
        availablePlays = await generateMovingPhaseAvailablePlays(gameId, turnState.currentPlayerId);
        break;

      case 'building':
        availablePlays = await generateBuildingPhaseAvailablePlays(gameId, turnState.currentPlayerId);
        break;

      default:
        return [];
    }

    // Check for blocked player: if no moves available during moving or building phase, eliminate player
    if (availablePlays.length === 0 && (turnState.currentPhase === 'moving' || turnState.currentPhase === 'building')) {
      logger.info(`🚫 Player ${turnState.currentPlayerId} is blocked in ${turnState.currentPhase} phase - no moves available!`);

      await handleBlockedPlayer(gameId, turnState.currentPlayerId);

      // Return empty array since current player is eliminated
      return [];
    }

    return availablePlays;
  } catch (error) {
    logger.error(`Failed to get available plays for game ${gameId}:`, error);
    return [];
  }
}

/**
 * Execute a move and advance the turn state
 */
export async function executeMove(gameId: number, playerId: number, move: any): Promise<MoveResult> {
  try {
    const turnState = await getCurrentTurnState(gameId);
    if (!turnState) {
      return { success: false, error: 'Game not found' };
    }

    if (turnState.isGameOver) {
      return { success: false, error: 'Game is already over' };
    }

    if (turnState.currentPlayerId !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Validate move is available
    const availablePlays = await getAvailablePlays(gameId);

    // Debug: Log the comparison
    logger.info(`🔍 Validating move:`, JSON.stringify(move, null, 2));
    logger.info(`🔍 Available plays count: ${availablePlays.length}`);
    logger.info(`🔍 Available plays (first few):`, JSON.stringify(availablePlays.slice(0, 3), null, 2));

    const isValidMove = availablePlays.some(play => {
      // Compare moves by content, not field order
      const basicMatch = (
        play.type === move.type &&
        play.workerId === move.workerId &&
        play.playerId === move.playerId &&
        play.position?.x === move.position?.x &&
        play.position?.y === move.position?.y
      );

      // Handle "from" position - moves can use either fromPosition or fromWorkerPosition
      // We need to check that the actual position values match, regardless of field name
      let fromPositionMatch = true;

      // Get the actual from coordinates from both moves
      const playFromX = play.fromPosition?.x ?? play.fromWorkerPosition?.x;
      const playFromY = play.fromPosition?.y ?? play.fromWorkerPosition?.y;
      const moveFromX = move.fromPosition?.x ?? move.fromWorkerPosition?.x;
      const moveFromY = move.fromPosition?.y ?? move.fromWorkerPosition?.y;

      // If either move has a from position, they must match
      if (playFromX !== undefined || moveFromX !== undefined) {
        fromPositionMatch = (playFromX === moveFromX && playFromY === moveFromY);
      }

      const matches = basicMatch && fromPositionMatch;

      if (matches) {
        logger.info(`🔍 Found matching move for worker ${move.workerId}: (${moveFromX}, ${moveFromY}) → (${move.position?.x}, ${move.position?.y})`);
      }
      return matches;
    });

    if (!isValidMove) {
      logger.warn(`🔍 No matching move found. Move:`, JSON.stringify(move, null, 2));
      logger.warn(`🔍 Available plays:`, JSON.stringify(availablePlays, null, 2));
      logger.warn(`🔍 Move details: type=${move.type}, workerId=${move.workerId}, position=(${move.position?.x}, ${move.position?.y}), fromPosition=(${move.fromPosition?.x}, ${move.fromPosition?.y})`);
      logger.warn(`🔍 First available play details:`, availablePlays.length > 0 ? JSON.stringify(availablePlays[0], null, 2) : 'No plays available');
      return { success: false, error: 'Invalid move' };
    }

    // Apply the move to board state
    const moveResult = await applyMoveToBoard(gameId, move, playerId);
    if (!moveResult.success) {
      return moveResult;
    }

    // Check if the move resulted in a win
    if (moveResult.isWin) {
      await endGame(gameId, moveResult.winner!, 'win_condition');
      return {
        success: true,
        gameOver: true,
        winner: moveResult.winner,
        newTurnState: await getCurrentTurnState(gameId) || undefined
      };
    }

    // Advance turn state
    const newTurnState = await advanceTurnState(gameId, turnState, move, moveResult);
    
    // Get next available plays (this may end the game if player is blocked)
    const nextPlays = await getAvailablePlays(gameId);

    // Check if game ended due to blocked player
    const finalTurnState = await getCurrentTurnState(gameId);
    if (finalTurnState?.isGameOver) {
      return {
        success: true,
        gameOver: true,
        winner: finalTurnState.winner,
        newTurnState: finalTurnState,
        availablePlays: []
      };
    }

    return {
      success: true,
      newTurnState: finalTurnState || undefined,
      availablePlays: nextPlays
    };

  } catch (error) {
    logger.error(`Failed to execute move for game ${gameId}:`, error);
    return { success: false, error: 'Failed to execute move' };
  }
}

/**
 * Apply a move to the board state and save to database
 */
async function applyMoveToBoard(gameId: number, move: any, playerId: number): Promise<MoveResult> {
  try {
    const boardState = await loadBoardState(gameId);
    if (!boardState) {
      return { success: false, error: 'Failed to load board state' };
    }

    // Apply move based on type
    switch (move.type) {
      case 'place_worker':
        return await applyPlaceWorker(gameId, boardState, move, playerId);
      
      case 'move_worker':
        return await applyMoveWorker(gameId, boardState, move, playerId);
      
      case 'build_block':
      case 'build_dome':
        return await applyBuild(gameId, boardState, move);
      
      default:
        return { success: false, error: 'Unknown move type' };
    }
  } catch (error) {
    logger.error(`Failed to apply move to board:`, error);
    return { success: false, error: 'Failed to apply move' };
  }
}

/**
 * Apply place worker move
 */
async function applyPlaceWorker(gameId: number, boardState: BoardState, move: any, playerId: number): Promise<MoveResult> {
  const { position } = move;

  // Get current turn state to determine worker ID
  const turnState = await getCurrentTurnState(gameId);
  if (!turnState) {
    return { success: false, error: 'Could not get turn state' };
  }

  // Use the authenticated playerId (already passed as parameter)

  // Determine worker ID based on how many workers this player has already placed
  // Each player gets workers 1 and 2
  // Count existing workers for this player
  let existingWorkerCount = 0;
  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      const cell = boardState.cells[x][y];
      if (cell.worker && cell.worker.playerId === playerId) {
        existingWorkerCount++;
      }
    }
  }

  // Worker ID is the next worker for this player (1 or 2)
  const workerId = existingWorkerCount + 1;

  if (workerId > 2) {
    return { success: false, error: `Player ${playerId} already has 2 workers placed` };
  }

  // Validate position is empty
  if (boardState.cells[position.x][position.y].worker) {
    return { success: false, error: 'Position already occupied' };
  }

  // Place worker
  boardState.cells[position.x][position.y].worker = { playerId, workerId };
  boardState.workers.set(`${playerId}-${workerId}`, {
    x: position.x,
    y: position.y,
    playerId
  });

  // Save board state
  await saveBoardState(gameId, boardState);

  logger.info(`Player ${playerId} placed worker ${workerId} at (${position.x}, ${position.y})`);
  return { success: true };
}

/**
 * Apply move worker move
 */
async function applyMoveWorker(gameId: number, boardState: BoardState, move: any, playerId: number): Promise<MoveResult> {
  const { workerId, position, fromPosition } = move;

  // Verify the worker at the from position belongs to the authenticated player
  const currentWorker = boardState.cells[fromPosition.x][fromPosition.y].worker;
  if (!currentWorker) {
    return { success: false, error: `No worker found at position (${fromPosition.x}, ${fromPosition.y})` };
  }

  if (currentWorker.playerId !== playerId) {
    return { success: false, error: `Worker does not belong to player ${playerId}` };
  }

  // Check if this move is a winning move (level 2 → level 3)
  const { isWinningMove } = await import('./boardState');
  const isWin = isWinningMove(boardState, fromPosition.x, fromPosition.y, position.x, position.y);

  // Remove worker from old position
  boardState.cells[fromPosition.x][fromPosition.y].worker = undefined;

  // Place worker at new position
  boardState.cells[position.x][position.y].worker = { playerId, workerId };
  boardState.workers.set(`${playerId}-${workerId}`, { 
    x: position.x, 
    y: position.y, 
    playerId 
  });

  // Save board state
  await saveBoardState(gameId, boardState);

  logger.info(`Player ${playerId} moved worker ${workerId} from (${fromPosition.x}, ${fromPosition.y}) to (${position.x}, ${position.y})`);

  if (isWin) {
    logger.info(`🎉 Player ${playerId} wins! Worker moved from level 2 to level 3`);
    return { success: true, isWin: true, winner: playerId };
  }

  return {
    success: true,
    lastMovedWorkerId: workerId,
    lastMovedWorkerPosition: position
  };
}

/**
 * Apply build move
 */
async function applyBuild(gameId: number, boardState: BoardState, move: any): Promise<MoveResult> {
  const { position, buildingLevel, buildingType, playerId, workerId } = move;

  if (move.type === 'build_block') {
    // If buildingLevel is provided, use it; otherwise calculate from current height
    const targetLevel = buildingLevel !== undefined
      ? buildingLevel
      : boardState.cells[position.x][position.y].height + 1;

    boardState.cells[position.x][position.y].height = targetLevel;
    logger.info(`Player ${playerId} built level ${targetLevel} block at (${position.x}, ${position.y}) with worker ${workerId}`);
  } else if (move.type === 'build_dome') {
    boardState.cells[position.x][position.y].hasDome = true;
    logger.info(`Player ${playerId} built dome at (${position.x}, ${position.y}) with worker ${workerId}`);
  }

  // Save board state
  await saveBoardState(gameId, boardState);

  return { success: true };
}

/**
 * Advance turn state after a successful move
 */
async function advanceTurnState(gameId: number, currentState: TurnState, move: any, moveResult?: MoveResult): Promise<TurnState> {
  logger.info(`🔄 advanceTurnState called for game ${gameId}`);
  logger.info(`🔄 Current state:`, currentState);
  logger.info(`🔄 Move:`, move);

  let newState = { ...currentState };

  if (currentState.currentPhase === 'placing') {
    // Placing phase: increment completed turns and switch players
    logger.info(`🔄 Placing phase: incrementing placingTurnsCompleted from ${newState.placingTurnsCompleted} to ${newState.placingTurnsCompleted + 1}`);
    newState.placingTurnsCompleted += 1;
    
    // Switch to next player
    const game = await gameRepository.findGameById(gameId);
    const playerIds = await gameRepository.findPlayersByGameId(gameId);
    const currentIndex = playerIds.indexOf(currentState.currentPlayerId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    newState.currentPlayerId = playerIds[nextIndex];
    
    // Check if placing phase is complete (4 workers total for 2 players)
    if (newState.placingTurnsCompleted >= playerIds.length * 2) {
      newState.currentPhase = 'moving';
      newState.currentPlayerId = playerIds[0]; // First player starts moving phase
      logger.info(`Game ${gameId}: Placing phase complete, starting moving phase with player ${newState.currentPlayerId}`);
    }
  } else if (currentState.currentPhase === 'moving') {
    // Moving phase: advance to building phase (same player)
    newState.currentPhase = 'building';

    // Store which worker moved (for building restrictions)
    if (moveResult?.lastMovedWorkerId && moveResult?.lastMovedWorkerPosition) {
      newState.lastMovedWorkerId = moveResult.lastMovedWorkerId;
      newState.lastMovedWorkerPosition = moveResult.lastMovedWorkerPosition;
      logger.info(`Game ${gameId}: Player ${newState.currentPlayerId} moves to building phase. Worker ${moveResult.lastMovedWorkerId} at (${moveResult.lastMovedWorkerPosition.x}, ${moveResult.lastMovedWorkerPosition.y}) can build`);
    } else {
      logger.info(`Game ${gameId}: Player ${newState.currentPlayerId} moves to building phase`);
    }
  } else if (currentState.currentPhase === 'building') {
    // Building phase: advance to next player's moving phase
    const playerIds = await gameRepository.findPlayersByGameId(gameId);
    const currentIndex = playerIds.indexOf(currentState.currentPlayerId);
    const nextIndex = (currentIndex + 1) % playerIds.length;

    newState.currentPlayerId = playerIds[nextIndex];
    newState.currentPhase = 'moving';
    newState.turnNumber += 1;

    // Clear worker movement tracking for new turn
    newState.lastMovedWorkerId = undefined;
    newState.lastMovedWorkerPosition = undefined;

    logger.info(`Game ${gameId}: Turn ${newState.turnNumber} - Player ${newState.currentPlayerId} starts moving phase`);
  }

  // Update database
  logger.info(`🔄 Updating database with new state:`, {
    current_player_id: newState.currentPlayerId,
    game_phase: newState.currentPhase,
    turn_number: newState.turnNumber,
    placing_turns_completed: newState.placingTurnsCompleted,
    last_moved_worker_id: newState.lastMovedWorkerId,
    last_moved_worker_position: newState.lastMovedWorkerPosition
  });

  await gameRepository.updateGame(gameId, {
    current_player_id: newState.currentPlayerId,
    game_phase: newState.currentPhase,
    turn_number: newState.turnNumber,
    placing_turns_completed: newState.placingTurnsCompleted,
    last_moved_worker_id: newState.lastMovedWorkerId,
    last_moved_worker_x: newState.lastMovedWorkerPosition?.x || null,
    last_moved_worker_y: newState.lastMovedWorkerPosition?.y || null
  });

  logger.info(`🔄 Database updated successfully for game ${gameId}`);
  return newState;
}

/**
 * End the game with a winner
 */
async function endGame(gameId: number, winnerId: number, reason: string): Promise<void> {
  logger.info(`🏁 endGame called for game ${gameId}: winner=${winnerId}, reason=${reason}`);
  logger.info(`🏁 Stack trace:`, new Error().stack);

  await gameRepository.updateGame(gameId, {
    game_status: 'completed',
    winner_id: winnerId,
    win_reason: reason
  });

  logger.info(`Game ${gameId} ended: Player ${winnerId} wins by ${reason}`);
}

/**
 * Handle a blocked player - eliminate them or end the game
 */
async function handleBlockedPlayer(gameId: number, blockedPlayerId: number): Promise<void> {
  // Get all players in the game
  const allPlayerIds = await gameRepository.findPlayersByGameId(gameId);
  const remainingPlayers = allPlayerIds.filter(id => id !== blockedPlayerId);

  // Remove blocked player's workers from board
  await removePlayerWorkers(gameId, blockedPlayerId);

  logger.info(`Player ${blockedPlayerId} eliminated. ${remainingPlayers.length} players remaining.`);

  // Check if game should end (only 1 player left)
  if (remainingPlayers.length === 1) {
    const winner = remainingPlayers[0];
    await endGame(gameId, winner, 'last_player_standing');
    logger.info(`🏁 Game ${gameId} ended: Player ${winner} wins - last player standing`);
    return;
  }

  // Game continues - advance to next active player
  const nextPlayer = getNextActivePlayer(blockedPlayerId, allPlayerIds, remainingPlayers);

  await gameRepository.updateGame(gameId, {
    current_player_id: nextPlayer,
    game_phase: 'moving', // Reset to moving phase for next player
    last_moved_worker_id: null,
    last_moved_worker_x: null,
    last_moved_worker_y: null
  });

  logger.info(`Game ${gameId} continues with player ${nextPlayer}`);
}

/**
 * Remove all workers belonging to an eliminated player
 */
async function removePlayerWorkers(gameId: number, playerId: number): Promise<void> {
  const boardState = await loadBoardState(gameId);

  // Remove all workers belonging to this player
  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      const worker = boardState.cells[x][y].worker;
      if (worker && worker.playerId === playerId) {
        boardState.cells[x][y].worker = undefined;
      }
    }
  }

  // Remove from worker tracking
  const workersToRemove: string[] = [];
  for (const [workerKey, workerData] of boardState.workers.entries()) {
    if (workerData.playerId === playerId) {
      workersToRemove.push(workerKey);
    }
  }

  for (const workerKey of workersToRemove) {
    boardState.workers.delete(workerKey);
  }

  await saveBoardState(gameId, boardState);
  logger.info(`Removed all workers for eliminated player ${playerId}`);
}

/**
 * Get the next active player in turn order
 */
function getNextActivePlayer(
  eliminatedPlayerId: number,
  originalPlayerIds: number[],
  activePlayerIds: number[]
): number {
  // Find eliminated player in original turn order
  const eliminatedIndex = originalPlayerIds.indexOf(eliminatedPlayerId);

  // Find the next active player in the original turn order
  for (let i = 1; i < originalPlayerIds.length; i++) {
    const nextIndex = (eliminatedIndex + i) % originalPlayerIds.length;
    const nextPlayerId = originalPlayerIds[nextIndex];

    // If this player is still active, they're the next player
    if (activePlayerIds.includes(nextPlayerId)) {
      return nextPlayerId;
    }
  }

  // Fallback to first active player (shouldn't happen)
  return activePlayerIds[0];
}
