export type RuleErrorCode = "illegal_move" | "game_full" | "not_in_game" | "not_your_turn" | "invalid_game_state";

/** A rule of the game says no. The message is meant for the player. */
export class GameRuleError extends Error {
  constructor(
    message: string,
    public readonly code: RuleErrorCode = "invalid_game_state",
  ) {
    super(message);
    this.name = "GameRuleError";
  }
}
