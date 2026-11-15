import { Game } from "../../../../src/game/domain/Game.ts";
import { GameRepositoryDb } from "../../../../src/game/infra/GameRepositoryDb.ts";
import { GameService } from "../../../../src/game/application/GameService.ts";
import { Player } from "../../../../src/game/domain/Player.ts";

function serviceFor(game: Game): GameService {
  const repository = { findById: async () => game } as unknown as GameRepositoryDb;
  return new GameService(repository);
}

describe("GameService.getGameStateForPlayer available moves", () => {
  let game: Game;

  beforeEach(() => {
    game = Game.create(1, 100, 2);
    game.addPlayer(new Player(1, 100, 0));
    game.addPlayer(new Player(2, 101, 1));
    for (const [playerId] of game.players) {
      game.setPlayerReady(playerId, true);
    }
  });

  it("includes the available moves for the player whose turn it is", async () => {
    const view = await serviceFor(game).getGameStateForPlayer(1, 100);

    expect(view.availableMoves?.length).toBeGreaterThan(0);
  });

  it("leaves them out for a player whose turn it is not", async () => {
    const view = await serviceFor(game).getGameStateForPlayer(1, 101);

    expect(view.availableMoves).toBeUndefined();
  });

  it("leaves them out for a user who is not in the game", async () => {
    const view = await serviceFor(game).getGameStateForPlayer(1, 999);

    expect(view.availableMoves).toBeUndefined();
  });
});
