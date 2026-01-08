// Chronus: You also win when there are at least five Complete Towers on the board.

import { GameHook, GameContext } from '../types';

export class ChronusHook implements GameHook {
  name = "Chronus";
  priority = 5; // Higher priority to check win condition early

  afterTurn(context: GameContext): GameContext {
    // TODO: Check for Chronus win condition
    // This would need to check board state for 5 complete towers
    return context;
  }
}
