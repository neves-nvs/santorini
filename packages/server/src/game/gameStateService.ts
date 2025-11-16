import { findUsersByGame } from "./gameRepository";
import { getCurrentTurnState, getAvailablePlays } from "./turnManager";
import { loadBoardState } from "./boardState";
import logger from "../logger";

/**
 * Service responsible for generating game state messages for different contexts
 */

/**
 * Generate personalized game state for each player
 * Only the current player receives available plays
 */
export async function generatePersonalizedGameStates(gameId: number, game: any): Promise<Map<number, any>> {
  const players = await findUsersByGame(gameId);
  const turnState = await getCurrentTurnState(gameId);
  const currentPlayerId = turnState?.currentPlayerId;

  logger.info(`Generating personalized game states for game ${gameId}, current player: ${currentPlayerId}`);

  const gameStates = new Map<number, any>();

  for (const player of players) {
    const isCurrentPlayer = player.id === currentPlayerId;
    const personalizedGameState = await generateGameStateForPlayer(game, gameId, player.id, isCurrentPlayer);

    logger.info(`Generated game state for player ${player.id} (${player.username}), isCurrentPlayer: ${isCurrentPlayer}, availablePlays: ${personalizedGameState.availablePlays.length}`);

    gameStates.set(player.id, personalizedGameState);
  }

  return gameStates;
}

/**
 * Generate game state for frontend (non-personalized)
 * Used for broadcasts where all players get the same state
 */
export async function generateGameStateForFrontend(game: any, gameId: number): Promise<any> {
  return await generateGameStateForPlayer(game, gameId, 0, false);
}

/**
 * Generate game state for a specific player
 * Consistent with HTTP API format
 */
async function generateGameStateForPlayer(game: any, gameId: number, playerId: number, isCurrentPlayer: boolean): Promise<any> {
  // Get players
  const players = await findUsersByGame(gameId);
  logger.info(`Game ${gameId} generateGameStateForPlayer: Found ${players.length} players:`, players.map(p => ({ id: p.id, username: p.username })));

  // Get turn state and available plays (only for current player in in-progress games)
  const turnState = await getCurrentTurnState(gameId);
  let availablePlays: any[] = [];

  // Only generate available plays for the current player in in-progress games
  if (game.game_status === 'in-progress' && isCurrentPlayer) {
    availablePlays = await getAvailablePlays(gameId);
    logger.info(`Generated ${availablePlays.length} available plays for current player ${playerId} in game ${gameId}`);
  } else if (game.game_status === 'in-progress') {
    logger.info(`Skipping available plays for non-current player ${playerId} in game ${gameId}`);
  } else {
    logger.info(`Skipping available plays for player ${playerId} in game ${gameId} (status: ${game.game_status})`);
  }

  // Get board state
  let boardState = null;
  if (game.game_status === 'in-progress' || game.game_status === 'completed') {
    boardState = await generateGameBoard(gameId);
  }

  // Convert to frontend format (same as HTTP API)
  return {
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
    player_count: game.player_count, // Maximum players allowed
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

    // WebSocket-specific fields (preserve existing functionality)
    players_count: players.length, // Current number of players
    ready_status_count: undefined // Will be set by caller if needed
  };
}

/**
 * Generate the current board state for a game in frontend format
 */
export async function generateGameBoard(gameId: number) {
  logger.info(`Getting board state for game ${gameId}`);

  try {
    // Load actual board state from database
    const boardState = await loadBoardState(gameId);

    const spaces: any[] = [];

    // Convert our BoardState to frontend format
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const cell = boardState.cells[x][y];
        const space = {
          x,
          y,
          height: cell.height,
          hasDome: cell.hasDome,
          workers: [] as any[]
        };

        // Add worker if present
        if (cell.worker) {
          space.workers.push({
            playerId: cell.worker.playerId,
            workerId: cell.worker.workerId,
            color: cell.worker.playerId === 1 ? 'blue' : 'red'
          });
        }

        spaces.push(space);
      }
    }

    const board = { spaces };

    logger.info(`Loaded board state from database for game ${gameId} with ${spaces.filter(s => s.workers.length > 0).length} workers`);
    return board;

  } catch (error) {
    logger.error(`Failed to load board state for game ${gameId}:`, error);

    // Fallback to empty board
    const spaces: any[] = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        spaces.push({
          x,
          y,
          height: 0,
          hasDome: false,
          workers: []
        });
      }
    }

    return { spaces };
  }
}

/**
 * Helper function to map backend phases to frontend phases
 */
function mapBackendPhaseToFrontend(backendPhase: string | null, gameStatus: string): string {
  if (gameStatus === 'completed') return 'FINISHED';
  if (gameStatus === 'waiting') return 'SETUP';
  if (backendPhase === 'placing') return 'SETUP';
  if (backendPhase === 'moving' || backendPhase === 'building') return 'PLAYING';
  return 'SETUP';
}
