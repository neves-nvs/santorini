import { Game, GameEvent, Player, asGameId, asPlayerId, asUserId } from "@santorini/engine";
import { GameBroadcaster } from "@/game/application/GameBroadcaster.ts";
import { GameNotFoundError } from "@/errors/GameErrors.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { GameService } from "@/game/application/GameService.ts";
import { GameViewBuilder } from "@/game/application/GameViewBuilder.ts";

function setup(game: Game | null) {
  const repository = {
    findById: async () => game,
    update: async (_gameId: unknown, change: (game: Game) => GameEvent[]) =>
      game ? { game, events: change(game) } : null,
  } as unknown as GameRepositoryDb;
  const broadcaster = { broadcastGameUpdate: vi.fn() };
  const service = new GameService(repository, new GameViewBuilder(), broadcaster as unknown as GameBroadcaster);
  return { service, broadcaster, repository };
}

function gameWith(players: number): Game {
  const game = Game.create(asGameId(1), asUserId(100), 2);
  for (let seat = 0; seat < players; seat++) {
    game.addPlayer(new Player(asPlayerId(seat + 1), asUserId(100 + seat), seat));
  }
  return game;
}

describe("GameService.getGameView", () => {
  it("is the game as the user sees it", async () => {
    const game = gameWith(2);
    for (const [playerId] of game.players) {
      game.setPlayerReady(playerId, true);
    }
    const { service } = setup(game);

    expect((await service.getGameView(asGameId(1), asUserId(100))).viewer).toMatchObject({
      role: "player",
      isCurrentPlayer: true,
    });
    expect((await service.getGameView(asGameId(1), asUserId(999))).viewer).toEqual({ role: "spectator" });
  });

  it("refuses a game that does not exist", async () => {
    const { service } = setup(null);

    await expect(service.getGameView(asGameId(5), asUserId(100))).rejects.toBeInstanceOf(GameNotFoundError);
  });
});

describe("GameService publishes every change to the game", () => {
  it("after a player joins", async () => {
    const game = gameWith(1);
    const { service, broadcaster } = setup(game);

    await service.addPlayer(asGameId(1), asUserId(200));

    expect(broadcaster.broadcastGameUpdate).toHaveBeenCalledExactlyOnceWith(game);
  });

  it("after a player leaves", async () => {
    const game = gameWith(2);
    const { service, broadcaster } = setup(game);

    await service.removePlayer(asGameId(1), asUserId(101));

    expect(broadcaster.broadcastGameUpdate).toHaveBeenCalledExactlyOnceWith(game);
  });

  it("after a player changes their ready status", async () => {
    const game = gameWith(2);
    const { service, broadcaster } = setup(game);

    await service.setPlayerReady(asGameId(1), asUserId(100), true);

    expect(broadcaster.broadcastGameUpdate).toHaveBeenCalledExactlyOnceWith(game);
  });

  it("not after a join that is refused", async () => {
    const { service, broadcaster } = setup(gameWith(2));

    await expect(service.addPlayer(asGameId(1), asUserId(200))).rejects.toThrow();

    expect(broadcaster.broadcastGameUpdate).not.toHaveBeenCalled();
  });
});
