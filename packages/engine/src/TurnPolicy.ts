import { Game } from "./Game.ts";
import { GamePhase, Seat, asSeat } from "./types.ts";
import { Move } from "./Move.ts";
import { MoveResult } from "./Board.ts";

/**
 * Result of turn advancement
 */
export interface TurnAdvancement {
  nextSeat: Seat;
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
export class DefaultTurnPolicy {
  advanceTurn(game: Game, _move: Move, moveResult: MoveResult): TurnAdvancement {
    const currentPhase = game.phase!;

    if (currentPhase === "placing") {
      return this.advancePlacingTurn(game);
    } else if (currentPhase === "moving") {
      return this.advanceMovingTurn(game, moveResult);
    } else if (currentPhase === "building") {
      return this.advanceBuildingTurn(game);
    }

    throw new Error(`Unknown phase: ${currentPhase}`);
  }

  getNextPlayer(game: Game, currentSeat: Seat): Seat {
    return asSeat((currentSeat + 1) % game.players.length);
  }

  getNextPhase(game: Game, _move: Move, _moveResult: MoveResult): GamePhase {
    const currentPhase = game.phase!;

    if (currentPhase === "placing") {
      return this.isPlacingPhaseComplete(game) ? "moving" : "placing";
    } else if (currentPhase === "moving") {
      return "building";
    } else if (currentPhase === "building") {
      return "moving";
    }

    return currentPhase;
  }

  isPlacingPhaseComplete(game: Game): boolean {
    // Each player places 2 workers, so total = players * 2
    const totalWorkersToPlace = game.players.length * 2;
    return game.placingTurnsCompleted >= totalWorkersToPlace;
  }

  private advancePlacingTurn(game: Game): TurnAdvancement {
    const newPlacingTurnsCompleted = game.placingTurnsCompleted + 1;
    const nextSeat = this.getNextPlayer(game, game.currentSeat!);

    // Check if placing phase is complete after this move
    const isComplete = newPlacingTurnsCompleted >= game.players.length * 2;
    const nextPhase: GamePhase = isComplete ? "moving" : "placing";

    return {
      nextSeat: isComplete ? asSeat(0) : nextSeat,
      nextPhase,
      turnNumber: isComplete ? game.turnNumber + 1 : game.turnNumber,
      placingTurnsCompleted: newPlacingTurnsCompleted,
    };
  }

  private advanceMovingTurn(game: Game, moveResult: MoveResult): TurnAdvancement {
    return {
      nextSeat: game.currentSeat!, // Same player continues to building
      nextPhase: "building",
      turnNumber: game.turnNumber,
      placingTurnsCompleted: game.placingTurnsCompleted,
      lastMovedWorkerId: moveResult.lastMovedWorkerId,
      lastMovedWorkerPosition: moveResult.lastMovedWorkerPosition,
    };
  }

  private advanceBuildingTurn(game: Game): TurnAdvancement {
    const nextSeat = this.getNextPlayer(game, game.currentSeat!);

    return {
      nextSeat,
      nextPhase: "moving",
      turnNumber: game.turnNumber + 1,
      placingTurnsCompleted: game.placingTurnsCompleted,
      lastMovedWorkerId: undefined,
      lastMovedWorkerPosition: undefined,
    };
  }
}
