// Apollo: You may move your Worker into an opponent Worker's space by forcing their Worker to the space yours just vacated.

import { GameHook, GameContext, Play } from '../types';

export class ApolloHook implements GameHook {
  name = "Apollo";
  priority = 10;

  modifyPlacingMoves(moves: Play[], context: GameContext): Play[] {
    // Apollo doesn't modify placing moves
    return moves;
  }

  // TODO: Implement moving moves modification for Apollo's power
}
