import * as gameSession from "./gameSession";
import { generatePersonalizedGameStates, generateGameStateForFrontend } from "./gameStateService";
import { WS_MESSAGE_TYPES } from "../../../shared/src/websocket-types";
import logger from "../logger";

/**
 * Service responsible for broadcasting game updates to players
 * Handles WebSocket broadcasting logic separate from business logic
 */

/**
 * Broadcast personalized game states to each player
 * Only the current player receives available plays
 */
export async function broadcastPersonalizedGameState(gameId: number, game: any): Promise<void> {
  const gameStates = await generatePersonalizedGameStates(gameId, game);

  // Send personalized game state to each player
  for (const [playerId, gameState] of gameStates) {
    logger.info(`Sending game state to player ${playerId}, availablePlays: ${gameState.availablePlays.length}`);

    gameSession.sendToPlayer(gameId, playerId, {
      type: "game_state_update",
      payload: gameState
    });
  }
}

/**
 * Broadcast the same game state to all players
 */
export async function broadcastGameState(gameId: number, game: any): Promise<void> {
  const formattedGameState = await generateGameStateForFrontend(game, gameId);
  
  gameSession.broadcastUpdate(gameId, {
    type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
    payload: formattedGameState
  });
}

/**
 * Broadcast game state with ready status during waiting phase
 */
export async function broadcastGameStateWithReadyStatus(gameId: number, game: any, playersReadyStatus: any): Promise<void> {
  const formattedGameState = await generateGameStateForFrontend(game, gameId);
  
  gameSession.broadcastUpdate(gameId, {
    type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
    payload: {
      ...formattedGameState,
      playersReadyStatus: playersReadyStatus
    }
  });
}

/**
 * Send available moves to a specific player
 */
export async function sendAvailableMovesToPlayer(gameId: number, playerId: number, availablePlays: any[]): Promise<void> {
  logger.info(`📤 Sending ${availablePlays.length} available_moves to current player ${playerId}`);
  
  gameSession.sendToPlayer(gameId, playerId, {
    type: WS_MESSAGE_TYPES.AVAILABLE_MOVES,
    payload: availablePlays
  });
}

/**
 * Broadcast player list update
 */
export function broadcastPlayerList(gameId: number, players: any[]): void {
  gameSession.broadcastUpdate(gameId, {
    type: "players_in_game",
    payload: players
  });
}
