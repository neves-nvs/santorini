// Artemis - Goddess of the Hunt
// Power: Your Worker may move one additional time, but not back to the space they started from.

import { GameHook, GameContext, Play, Position } from '../gameEngine';

export class ArtemisHook implements GameHook {
  name = "Artemis";
  priority = 10;
  
  // Track moves for each game to prevent returning to starting position
  private gameMoves = new Map<number, { workerId: number; startPosition: Position; firstMovePosition?: Position }>();

  modifyMovingMoves(moves: Play[], context: GameContext): Play[] {
    // If this is the second move for Artemis, filter out the starting position
    const gameMove = this.gameMoves.get(context.gameId);
    
    if (gameMove && gameMove.firstMovePosition) {
      // This is the second move - exclude the starting position
      return moves.filter(move => {
        if (!move.position) return true;
        return !(move.position.x === gameMove.startPosition.x && 
                move.position.y === gameMove.startPosition.y);
      });
    }
    
    // First move or no tracking - return all moves
    return moves;
  }

  beforeTurn(context: GameContext): GameContext {
    // Clear any previous move tracking for this game
    this.gameMoves.delete(context.gameId);
    return context;
  }

  // Method to track when a move is made (would be called by game engine)
  trackMove(gameId: number, workerId: number, fromPosition: Position, toPosition: Position): void {
    const existing = this.gameMoves.get(gameId);
    
    if (!existing) {
      // First move
      this.gameMoves.set(gameId, {
        workerId,
        startPosition: fromPosition,
        firstMovePosition: toPosition
      });
    } else {
      // Second move - clear tracking as turn is complete
      this.gameMoves.delete(gameId);
    }
  }
}
