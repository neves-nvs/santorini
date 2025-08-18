// Example of a placement restriction power

import { GameHook, GameContext, Play } from '../../gameEngine';

export class PlacementRestrictionHook implements GameHook {
  name = "PlacementRestriction";
  priority = 15;

  modifyPlacingMoves(moves: Play[], context: GameContext): Play[] {
    // Example: Can't place on corners
    return moves.filter(move => {
      const pos = move.position;
      if (!pos) return true;
      
      const isCorner = (pos.x === 0 || pos.x === 4) && (pos.y === 0 || pos.y === 4);
      return !isCorner;
    });
  }
}
