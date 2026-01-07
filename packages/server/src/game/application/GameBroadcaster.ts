import { GameViewBuilder, toSharedMove } from '../domain/GameViewBuilder';

import { Game } from '../domain/Game';
import { GameEvent } from '../domain/GameEvent';
import { Move } from '../domain/Move';
import { WS_MESSAGE_TYPES } from '../../../../shared/src/websocket-types';
import { WebSocketConnectionManager } from '../infra/WebSocketConnectionManager';
import logger from '../../logger';

/**
 * Application service responsible for broadcasting game updates to players
 * Handles event-driven broadcasting after domain operations
 */
export class GameBroadcaster {
  constructor(
    private gameViewBuilder: GameViewBuilder = new GameViewBuilder(),
    private wsConnectionManager: WebSocketConnectionManager = new WebSocketConnectionManager()
  ) {}

  /**
   * Broadcast game update to all players in the game
   * Each player receives their personalized view of the game state
   * The current player also receives their available moves
   */
  async broadcastGameUpdate(game: Game, events: GameEvent[]): Promise<void> {
    logger.info(`Broadcasting game update for game ${game.id} to all players`);

    // Get available moves for the current player (if game is in progress)
    const availableMoves = game.status === 'in-progress' ? game.getAvailableMoves() : [];

    // Send personalized game state to each player in the game
    for (const player of game.players.values()) {
      try {
        // Only pass availableMoves to the current player
        const isCurrentPlayer = game.currentPlayerId === player.id;
        const playerMoves = isCurrentPlayer ? availableMoves : undefined;
        const view = this.gameViewBuilder.buildForPlayer(game, player.userId, playerMoves);

        this.wsConnectionManager.sendToPlayer(game.id, player.userId, {
          type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
          payload: {
            gameId: game.id,
            version: game.version,
            state: view
          }
        });

        logger.debug(`Sent game state to player ${player.userId} for game ${game.id}, isCurrentPlayer: ${isCurrentPlayer}`);
      } catch (error) {
        logger.error(`Failed to send game state to player ${player.userId}:`, error);
      }
    }

    // Log the events that triggered this broadcast
    if (events.length > 0) {
      logger.info(`Broadcast triggered by events: ${events.map(e => e.type).join(', ')}`);
    }
  }

  /**
   * Broadcast game state with available moves to current player only
   */
  async broadcastGameStateWithMoves(game: Game, availableMoves: Move[]): Promise<void> {
    if (!game.currentPlayerId) {
      logger.warn(`No current player for game ${game.id}, skipping moves broadcast`);
      return;
    }

    // Get the current player's userId from their playerId
    const currentPlayer = game.players.get(game.currentPlayerId);
    if (!currentPlayer) {
      logger.warn(`Current player ${game.currentPlayerId} not found in game ${game.id}`);
      return;
    }
    const currentUserId = currentPlayer.userId;

    logger.info(`Broadcasting available moves to current player ${game.currentPlayerId} (userId: ${currentUserId}) in game ${game.id}`);

    try {
      const view = this.gameViewBuilder.buildForPlayer(game, currentUserId, availableMoves);

      this.wsConnectionManager.sendToPlayer(game.id, currentUserId, {
        type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
        payload: {
          gameId: game.id,
          version: game.version,
          state: view
        }
      });

      logger.debug(`Sent ${availableMoves.length} available moves to player ${game.currentPlayerId}`);
    } catch (error) {
      logger.error(`Failed to send available moves to player ${game.currentPlayerId}:`, error);
    }
  }

  /**
   * Broadcast game start to all players
   * Each player gets: type, activePlayer, and availableMoves (only if they're active)
   */
  async broadcastGameStart(game: Game, availableMoves: Move[]): Promise<void> {
    logger.info(`Broadcasting game start for game ${game.id}`);

    const sharedMoves = availableMoves.map(toSharedMove);

    for (const player of game.players.values()) {
      const isActivePlayer = game.currentPlayerId === player.id;

      this.wsConnectionManager.sendToPlayer(game.id, player.userId, {
        type: WS_MESSAGE_TYPES.GAME_START,
        payload: {
          gameId: game.id,
          activePlayerId: game.currentPlayerId,
          availableMoves: isActivePlayer ? sharedMoves : undefined
        }
      });
    }
  }

  /**
   * Broadcast game completion to all players
   */
  async broadcastGameEnd(game: Game): Promise<void> {
    logger.info(`Broadcasting game end for game ${game.id}, winner: ${game.winnerId}`);

    this.wsConnectionManager.broadcastToGame(game.id, {
      type: WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
      payload: {
        gameId: game.id,
        version: game.version,
        status: game.status,
        winnerId: game.winnerId,
        winReason: game.winReason,
        finishedAt: game.finishedAt
      }
    });
  }
}
