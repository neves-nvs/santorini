// Hera: An opponent cannot win by moving into a perimeter space.

import { GameContext, GameHook, Play } from '../gameEngine';

export class HeraHook implements GameHook {
  name = "Hera";
  priority = 1; // Very high priority to block wins

  validateMove(_move: Play, _context: GameContext): boolean {
    // TODO: Check if move is to perimeter and would cause win
    // Block opponent wins on perimeter
    return true;
  }
}
