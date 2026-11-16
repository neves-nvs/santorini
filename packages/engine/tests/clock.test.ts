import { Game } from "../src/Game.ts";
import { GameRuleError } from "../src/errors.ts";
import { Player } from "../src/Player.ts";

const at = (milliseconds: number) => () => new Date(milliseconds);

function startedGame(game: Game): ReturnType<Game["setPlayerReady"]> {
  game.addPlayer(new Player(1, 100, 0));
  game.addPlayer(new Player(2, 101, 1));
  game.setPlayerReady(1, true);
  return game.setPlayerReady(2, true);
}

describe("Game with an injected clock", () => {
  it("stamps creation, start and events from the clock", () => {
    const game = Game.create(1, 100, 2, { clock: at(1000) });
    expect(game.createdAt).toEqual(new Date(1000));

    const events = startedGame(game);

    expect(game.startedAt).toEqual(new Date(1000));
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.occurredAt.getTime() === 1000)).toBe(true);
  });

  it("uses the clock it is given after a snapshot round trip", () => {
    const game = Game.create(1, 100, 2, { clock: at(5) });
    const restored = Game.fromSnapshot(game.toSnapshot(), { clock: at(9000) });
    expect(restored.createdAt).toEqual(new Date(5));

    startedGame(restored);

    expect(restored.startedAt).toEqual(new Date(9000));
  });
});

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
