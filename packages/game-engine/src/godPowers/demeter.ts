// Demeter - Goddess of the Harvest
// Power: Your Worker may build one additional time, but not on the same space.

import { GameHook, GameContext, Play, Position } from '../types';

export class DemeterHook implements GameHook {
  name = "Demeter";
  priority = 10;
  
  // Track builds for each game to prevent building on same space twice
  private gameBuilds = new Map<number, { firstBuildPosition: Position }>();

  modifyBuildingMoves(moves: Play[], context: GameContext): Play[] {
    const gameBuild = this.gameBuilds.get(context.gameId);
    
    if (gameBuild) {
      // This is the second build - exclude the first build position
      return moves.filter(move => {
        if (!move.position) return true;
        return !(move.position.x === gameBuild.firstBuildPosition.x && 
                move.position.y === gameBuild.firstBuildPosition.y);
      });
    }
    
    // First build - return all moves
    return moves;
  }

  beforeTurn(context: GameContext): GameContext {
    // Clear any previous build tracking for this game
    this.gameBuilds.delete(context.gameId);
    return context;
  }

  // Method to track when a build is made (would be called by game engine)
  trackBuild(gameId: number, position: Position): void {
    const existing = this.gameBuilds.get(gameId);
    
    if (!existing) {
      // First build
      this.gameBuilds.set(gameId, {
        firstBuildPosition: position
      });
    } else {
      // Second build - clear tracking as turn is complete
      this.gameBuilds.delete(gameId);
    }
  }
}
