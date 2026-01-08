// Hermes: If your Workers do not move up or down, they may each move any number of times (even zero), and then either builds.

import { GameHook, GameContext } from '../types';

export class HermesHook implements GameHook {
  name = "Hermes";
  priority = 10;

  // This is a complex power that changes turn structure - perfect for hooks!
  beforeTurn(context: GameContext): GameContext {
    // TODO: Set up special Hermes turn state
    return context;
  }

  afterTurn(context: GameContext): GameContext {
    // TODO: Clean up Hermes turn state
    return context;
  }
}
