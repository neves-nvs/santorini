import { GameId, GameOutcome, Seat } from "./types.ts";
import { Board } from "./Board.ts";
import { Game } from "./Game.ts";
import { Player } from "./Player.ts";

export interface FilteredGameState {
  id: GameId;
  status: string;
  phase: string | null;
  currentSeat: Seat | null;
  turnNumber: number;
  version: number;
  board: Board;
  players: Player[];
  outcome: GameOutcome | null;
}

/**
 * Domain service that determines what information each player can see
 * Encapsulates visibility rules for different game states and player roles
 */
export class VisibilityPolicy {
  /**
   * Determine if a player can see another player's hand/hidden information
   */
  canSeePlayerHiddenInfo(_viewerId: number, _targetSeat: number, _game: Game): boolean {
    // In Santorini, there's no hidden information between players
    // All board state is visible to all players
    return true;
  }

  /**
   * Determine if a player can see game events/history
   */
  canSeeGameHistory(_viewerId: number, _game: Game): boolean {
    // All players can see the full game history
    return true;
  }

  /**
   * Determine if a player can see available moves for another player
   */
  canSeeAvailableMoves(viewerId: number, targetSeat: number, game: Game): boolean {
    // Only the current player can see their available moves
    return viewerId === targetSeat && game.currentSeat === viewerId;
  }

  /**
   * Determine if a spectator can see all information
   */
  canSpectatorSeeAll(_game: Game): boolean {
    // Spectators can see everything in Santorini (no hidden information)
    return true;
  }

  /**
   * Filter sensitive information from game state based on viewer
   */
  filterGameState(game: Game, _viewerId: number): FilteredGameState {
    // In Santorini, no filtering needed - all information is public
    return {
      id: game.id,
      status: game.status,
      phase: game.phase,
      currentSeat: game.currentSeat,
      turnNumber: game.turnNumber,
      version: game.version,
      board: game.board,
      players: [...game.players],
      outcome: game.outcome,
    };
  }
}
