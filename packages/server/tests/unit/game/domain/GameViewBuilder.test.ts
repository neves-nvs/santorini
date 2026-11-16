import { Game } from "@/game/domain/Game.ts";
import { GameViewBuilder } from "@/game/domain/GameViewBuilder.ts";
import { Player } from "@/game/domain/Player.ts";

const CURRENT_USER = 100;
const WAITING_USER = 101;
const OUTSIDER = 999;

function startedGame(): Game {
  const game = Game.create(1, CURRENT_USER, 2);
  game.addPlayer(new Player(1, CURRENT_USER, 0));
  game.addPlayer(new Player(2, WAITING_USER, 1));
  for (const [playerId] of game.players) {
    game.setPlayerReady(playerId, true);
  }
  return game;
}

describe("GameViewBuilder available moves", () => {
  const builder = new GameViewBuilder();

  it("gives the available moves to the player whose turn it is", () => {
    const game = startedGame();

    const view = builder.buildForPlayer(game, CURRENT_USER, game.getAvailableMoves());

    expect(view.isCurrentPlayer).toBe(true);
    expect(view.availableMoves?.length).toBeGreaterThan(0);
  });

  it("withholds the available moves from a player whose turn it is not, even when they are passed in", () => {
    const game = startedGame();

    const view = builder.buildForPlayer(game, WAITING_USER, game.getAvailableMoves());

    expect(view.isCurrentPlayer).toBe(false);
    expect(view.availableMoves).toBeUndefined();
  });

  it("withholds the available moves from a user who is not in the game", () => {
    const game = startedGame();

    const view = builder.buildForPlayer(game, OUTSIDER, game.getAvailableMoves());

    expect(view.isCurrentPlayer).toBe(false);
    expect(view.availableMoves).toBeUndefined();
  });
});
