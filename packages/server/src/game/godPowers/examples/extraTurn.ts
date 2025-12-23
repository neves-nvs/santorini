// Example of a turn-changing power card

import { GameContext, GameHook } from '../../gameEngine';

export class ExtraTurnHook implements GameHook {
  name = "ExtraTurn";
  priority = 20;

  afterTurn(context: GameContext): GameContext {
    // Don't change the current player - they get another turn!
    return {
      ...context,
      // Could add a flag to track this is an extra turn
    };
  }
}
