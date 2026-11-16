import { Game, Player } from "@santorini/engine";
import { GameView } from "@santorini/shared";
import { GameViewBuilder } from "@/game/application/GameViewBuilder.ts";

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

describe("GameViewBuilder viewer", () => {
  const builder = new GameViewBuilder();

  it("gives the available moves to the player whose turn it is", () => {
    const { viewer } = builder.buildFor(startedGame(), CURRENT_USER);

    expect(viewer).toMatchObject({ role: "player", playerId: 1, isCurrentPlayer: true });
    expect(viewer.role === "player" && viewer.availableMoves.length).toBeGreaterThan(0);
  });

  it("gives a player whose turn it is not an empty list of moves", () => {
    const { viewer } = builder.buildFor(startedGame(), WAITING_USER);

    expect(viewer).toEqual({ role: "player", playerId: 2, isCurrentPlayer: false, availableMoves: [] });
  });

  it("shows a user who is not in the game as a spectator, with no moves", () => {
    const { viewer } = builder.buildFor(startedGame(), OUTSIDER);

    expect(viewer).toEqual({ role: "spectator" });
  });
});

describe("GameViewBuilder game", () => {
  const builder = new GameViewBuilder();

  it("names the game limits and has no winner while the game is on", () => {
    const view = builder.buildFor(startedGame(), CURRENT_USER);

    expect(view).toMatchObject({
      gameId: 1,
      status: "in-progress",
      maxPlayers: 2,
      winnerPlayerId: null,
      winReason: null,
    });
    expect(view.players.map((player) => player.userId)).toEqual([CURRENT_USER, WAITING_USER]);
  });

  it("is the same game for everyone, whoever looks", () => {
    const game = startedGame();

    const sameGame = (view: GameView) => ({ ...view, viewer: undefined });

    expect(sameGame(builder.buildFor(game, OUTSIDER))).toEqual(sameGame(builder.buildFor(game, CURRENT_USER)));
  });
});
