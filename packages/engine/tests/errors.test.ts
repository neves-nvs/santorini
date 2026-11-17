import { asGameId, asPlayerId, asUserId } from "../src/types.ts";
import { Game } from "../src/Game.ts";
import { GameRuleError } from "../src/errors.ts";

describe("GameRuleError", () => {
  it("names the rule that was broken", () => {
    const game = Game.create(asGameId(1), asUserId(100), 2);

    const error = (() => {
      try {
        game.setPlayerReady(asPlayerId(7), true);
      } catch (thrown) {
        return thrown;
      }
    })();

    expect(error).toBeInstanceOf(GameRuleError);
    expect((error as GameRuleError).code).toBe("not_in_game");
  });
});
