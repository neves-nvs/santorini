import { Game, Player, asPlayerId } from "@santorini/engine";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";
import { db } from "@/database.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";

describe("Saving and loading a game", () => {
  const repository = new GameRepositoryDb();

  // The ids restart at 1 so that a player id in a game is also a user id: games.current_player_id references users.
  afterEach(cleanupTestData);

  afterAll(async () => {
    await db.destroy();
  });

  async function startedGame(): Promise<Game> {
    const creator = (await generateTestUser()).user;
    const guest = (await generateTestUser()).user;
    const game = await repository.createNew(creator.id, 2);
    game.addPlayer(new Player(asPlayerId(1), creator.id, 0));
    game.addPlayer(new Player(asPlayerId(2), guest.id, 1));
    await repository.save(game);
    game.setPlayerReady(asPlayerId(1), true);
    game.setPlayerReady(asPlayerId(2), true);
    await repository.save(game);
    return game;
  }

  test("keeps the worker that just moved, also on the first row and column", async () => {
    const game = await startedGame();
    const moved = Game.fromSnapshot({
      ...game.toSnapshot(),
      phase: "building",
      lastMovedWorkerId: 5,
      lastMovedWorkerPosition: { x: 0, y: 0 },
    });

    await repository.save(moved);

    const reloaded = await repository.findById(game.id);
    expect(reloaded?.toSnapshot()).toMatchObject({
      phase: "building",
      lastMovedWorkerId: 5,
      lastMovedWorkerPosition: { x: 0, y: 0 },
    });
  });

  test("keeps who is ready after a second save replaces the players", async () => {
    const game = await startedGame();
    const before = game.toSnapshot().players.map((player) => [player.userId, player.isReady]);

    await repository.save(game);

    const reloaded = await repository.findById(game.id);
    expect(reloaded?.toSnapshot().players.map((player) => [player.userId, player.isReady])).toEqual(before);
  });

  test("stores every column of a new game that is saved without having been created through the repository", async () => {
    const creator = (await generateTestUser()).user;
    const guest = (await generateTestUser()).user;
    const created = await repository.createNew(creator.id, 3);
    await db.deleteFrom("games").where("id", "=", created.id).execute();
    const game = Game.fromSnapshot({ ...Game.create(created.id, creator.id, 3).toSnapshot(), turnNumber: 4 });
    game.addPlayer(new Player(asPlayerId(1), creator.id, 0));
    game.addPlayer(new Player(asPlayerId(2), guest.id, 1));

    await repository.save(game);

    const reloaded = await repository.findById(game.id);
    expect(reloaded?.toSnapshot()).toMatchObject({ maxPlayers: 3, creatorId: creator.id, turnNumber: 4 });
    expect(reloaded?.players.size).toBe(2);
  });
});
