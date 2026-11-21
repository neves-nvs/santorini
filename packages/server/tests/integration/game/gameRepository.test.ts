import { asGameId, asSeat, Game, Player } from "@santorini/engine";

import { db } from "@/database.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";

describe("Saving and loading a game", () => {
  const repository = new GameRepositoryDb();

  afterEach(cleanupTestData);

  afterAll(async () => {
    await db.destroy();
  });

  async function startedGame(): Promise<Game> {
    const creator = (await generateTestUser()).user;
    const guest = (await generateTestUser()).user;
    const game = await repository.createNew(creator.id, 2);
    game.addPlayer(new Player(creator.id));
    game.addPlayer(new Player(guest.id));
    await repository.save(game);
    game.setPlayerReady(asSeat(0), true);
    game.setPlayerReady(asSeat(1), true);
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

  test("update saves what the change did and answers the events", async () => {
    const creator = (await generateTestUser()).user;
    const game = await repository.createNew(creator.id, 2);

    const result = await repository.update(game.id, (loaded) => loaded.addPlayer(new Player(creator.id)));

    expect(result?.events).toEqual([]);
    expect((await repository.findById(game.id))?.players.length).toBe(1);
  });

  test("update saves nothing when the change throws", async () => {
    const creator = (await generateTestUser()).user;
    const game = await repository.createNew(creator.id, 2);

    await expect(
      repository.update(game.id, (loaded) => {
        loaded.addPlayer(new Player(creator.id));
        throw new Error("refused");
      }),
    ).rejects.toThrow("refused");

    expect((await repository.findById(game.id))?.players.length).toBe(0);
  });

  test("update answers null for a game that does not exist", async () => {
    expect(await repository.update(asGameId(999999), () => [])).toBeNull();
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
    game.addPlayer(new Player(creator.id));
    game.addPlayer(new Player(guest.id));

    await repository.save(game);

    const reloaded = await repository.findById(game.id);
    expect(reloaded?.toSnapshot()).toMatchObject({ maxPlayers: 3, creatorId: creator.id, turnNumber: 4 });
    expect(reloaded?.players.length).toBe(2);
  });

  test.each([
    ["status", { game_status: "paused" }],
    ["phase", { game_phase: "resting" }],
  ])("refuses a stored game with an unknown %s instead of loading it", async (_column, columns) => {
    const creator = (await generateTestUser()).user;
    const { id } = await repository.createNew(creator.id, 2);
    await db
      .updateTable("games")
      .set(columns as never)
      .where("id", "=", id)
      .execute();

    await expect(repository.findById(id)).rejects.toThrow();
  });
});
