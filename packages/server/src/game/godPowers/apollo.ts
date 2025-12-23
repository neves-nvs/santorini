// Apollo: You may move your Worker into an opponent Worker's space by forcing their Worker to the space yours just vacated.

import { GameContext, GameHook, Play } from '../gameEngine';

export class ApolloHook implements GameHook {
  name = "Apollo";
  priority = 10;

  modifyPlacingMoves(moves: Play[], _context: GameContext): Play[] {
    // Apollo doesn't modify placing moves
    return moves;
  }

  // TODO: Implement moving moves modification for Apollo's power
}
