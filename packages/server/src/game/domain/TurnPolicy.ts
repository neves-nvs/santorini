import { Game } from './Game';
import { GamePhase } from './types';
import { Move } from './Move';
import { MoveResult } from './Board';
import { PlayerId } from './Player';

/**
 * Turn Policy Interface
 * 
 * Defines how turns advance in the game.
 * Can be swapped for different game variants or god powers that affect turn order.
 */
export interface TurnPolicy {
  /**
   * Advance the turn state after a successful move
   */
  advanceTurn(game: Game, move: Move, moveResult: MoveResult): TurnAdvancement;

  /**
   * Get the next player in turn order
   */
  getNextPlayer(game: Game, currentPlayerId: PlayerId): PlayerId;

  /**
   * Determine the next phase after a move
   */
  getNextPhase(game: Game, move: Move, moveResult: MoveResult): GamePhase;

  /**
   * Check if the placing phase is complete
   */
  isPlacingPhaseComplete(game: Game): boolean;
}

/**
 * Result of turn advancement
 */
export interface TurnAdvancement {
  nextPlayerId: PlayerId;
  nextPhase: GamePhase;
  turnNumber: number;
  placingTurnsCompleted: number;
  lastMovedWorkerId?: number;
  lastMovedWorkerPosition?: { x: number; y: number };
}

/**
 * Default Santorini Turn Policy
 * 
 * Implements standard Santorini turn rules:
 * - Placing phase: players alternate placing workers
 * - Moving/Building phases: players alternate full turns (move + build)
 */
export class DefaultTurnPolicy implements TurnPolicy {
  advanceTurn(game: Game, _move: Move, moveResult: MoveResult): TurnAdvancement {
    const currentPhase = game.phase!;

    if (currentPhase === 'placing') {
      return this.advancePlacingTurn(game);
    } else if (currentPhase === 'moving') {
      return this.advanceMovingTurn(game, moveResult);
    } else if (currentPhase === 'building') {
      return this.advanceBuildingTurn(game);
    }

    throw new Error(`Unknown phase: ${currentPhase}`);
  }

  getNextPlayer(game: Game, currentPlayerId: PlayerId): PlayerId {
    const playerIds = Array.from(game.players.keys());
    const currentIndex = playerIds.indexOf(currentPlayerId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    return playerIds[nextIndex];
  }

  getNextPhase(game: Game, _move: Move, _moveResult: MoveResult): GamePhase {
    const currentPhase = game.phase!;

    if (currentPhase === 'placing') {
      return this.isPlacingPhaseComplete(game) ? 'moving' : 'placing';
    } else if (currentPhase === 'moving') {
      return 'building';
    } else if (currentPhase === 'building') {
      return 'moving';
    }

    return currentPhase;
  }

  isPlacingPhaseComplete(game: Game): boolean {
    // Each player places 2 workers, so total = players * 2
    const totalWorkersToPlace = game.players.size * 2;
    return game.placingTurnsCompleted >= totalWorkersToPlace;
  }

  private advancePlacingTurn(game: Game): TurnAdvancement {
    const newPlacingTurnsCompleted = game.placingTurnsCompleted + 1;
    const nextPlayerId = this.getNextPlayer(game, game.currentPlayerId!);

    // Check if placing phase is complete after this move
    const isComplete = newPlacingTurnsCompleted >= game.players.size * 2;
    const nextPhase: GamePhase = isComplete ? 'moving' : 'placing';

    return {
      nextPlayerId: isComplete ? Array.from(game.players.keys())[0] : nextPlayerId,
      nextPhase,
      turnNumber: isComplete ? game.turnNumber + 1 : game.turnNumber,
      placingTurnsCompleted: newPlacingTurnsCompleted
    };
  }

  private advanceMovingTurn(game: Game, moveResult: MoveResult): TurnAdvancement {
    return {
      nextPlayerId: game.currentPlayerId!, // Same player continues to building
      nextPhase: 'building',
      turnNumber: game.turnNumber,
      placingTurnsCompleted: game.placingTurnsCompleted,
      lastMovedWorkerId: moveResult.lastMovedWorkerId,
      lastMovedWorkerPosition: moveResult.lastMovedWorkerPosition
    };
  }

  private advanceBuildingTurn(game: Game): TurnAdvancement {
    const nextPlayerId = this.getNextPlayer(game, game.currentPlayerId!);

    return {
      nextPlayerId,
      nextPhase: 'moving',
      turnNumber: game.turnNumber + 1,
      placingTurnsCompleted: game.placingTurnsCompleted,
      lastMovedWorkerId: undefined,
      lastMovedWorkerPosition: undefined
    };
  }
}
