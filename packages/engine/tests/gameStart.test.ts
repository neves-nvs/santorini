import { asGameId, asSeat, asUserId } from "../src/types.ts";
import { PlaceWorkerMove } from "../src/Move.ts";

import { Game } from "../src/Game.ts";

describe("A game started from a setup", () => {
  const creator = asUserId(100);
  const guest = asUserId(101);
  const setup = { creatorId: creator, players: [guest, creator] };

  it("is in progress from the start, in the placing phase with the first player to move", () => {
    const game = Game.start(asGameId(7), setup);

    expect(game.status).toBe("in-progress");
    expect(game.phase).toBe("placing");
    expect(game.currentSeat).toBe(0);
    expect(game.outcome).toBeNull();
  });

  it("seats the players in the order of the setup", () => {
    const game = Game.start(asGameId(7), setup);

    expect(game.players.map((player) => player.userId)).toEqual([guest, creator]);
    expect(game.maxPlayers).toBe(2);
    expect(game.creatorId).toBe(creator);
  });

  it("lets the first seat move and refuses the second", () => {
    const game = Game.start(asGameId(7), setup);

    expect(() => game.applyMove(asSeat(1), new PlaceWorkerMove(asSeat(1), { x: 0, y: 0 }, 1))).toThrow("Not your turn");
    game.applyMove(asSeat(0), new PlaceWorkerMove(asSeat(0), { x: 0, y: 0 }, 1));

    expect(game.currentSeat).toBe(1);
  });

  it("offers the first seat the places to put a worker", () => {
    const game = Game.start(asGameId(7), setup);

    expect(game.getAvailableMoves().length).toBeGreaterThan(0);
  });

  it("refuses a setup with fewer than two players", () => {
    expect(() => Game.start(asGameId(7), { creatorId: creator, players: [creator] })).toThrow("at least two players");
  });

  it("round-trips through a snapshot", () => {
    const game = Game.start(asGameId(7), setup);

    expect(Game.fromSnapshot(game.toSnapshot()).toSnapshot()).toEqual(game.toSnapshot());
  });
});
