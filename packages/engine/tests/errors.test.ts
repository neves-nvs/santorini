import { Game } from "../src/Game.ts";
import { GameRuleError } from "../src/errors.ts";

describe("GameRuleError", () => {
  it("names the rule that was broken", () => {
    const game = Game.create(1, 100, 2);

    const error = (() => {
      try {
        game.setPlayerReady(7, true);
      } catch (thrown) {
        return thrown;
      }
    })();

    expect(error).toBeInstanceOf(GameRuleError);
    expect((error as GameRuleError).code).toBe("not_in_game");
  });
});
