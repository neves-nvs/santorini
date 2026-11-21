import { asPlayerId, Player } from "@santorini/engine";

import { db } from "@/database.ts";
import { LobbyService } from "@/game/application/LobbyService.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";

describe("Listing and creating games", () => {
  const repository = new GameRepositoryDb();
  const lobby = new LobbyService(repository);

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestData();
  });

  afterAll(async () => {
    await db.destroy();
  });

  async function waitingGamesWithACreator(count: number) {
    const creator = (await generateTestUser()).user;
    for (let created = 0; created < count; created++) {
      const game = await repository.createNew(creator.id, 2);
      await repository.update(game.id, (loaded) => loaded.addPlayer(new Player(asPlayerId(1), creator.id, 0)));
    }
    return creator;
  }

  async function selectsDuring(action: () => Promise<unknown>) {
    const selectFrom = vi.spyOn(db, "selectFrom");
    await action();
    const queries = selectFrom.mock.calls.length;
    selectFrom.mockRestore();
    return queries;
  }

  test.each([1, 6])("lists %i games with the same few queries, whatever their number", async (count) => {
    const creator = await waitingGamesWithACreator(count);

    expect(await selectsDuring(() => repository.findByStatus("waiting"))).toBeLessThanOrEqual(3);
    expect(await selectsDuring(() => repository.findAll())).toBeLessThanOrEqual(3);
    expect(await selectsDuring(() => repository.findByPlayer(creator.id))).toBeLessThanOrEqual(3);
  });

  test("lists the same games that loading them one by one gives", async () => {
    const creator = await waitingGamesWithACreator(3);

    const listed = await repository.findByPlayer(creator.id);

    expect(listed).toHaveLength(3);
    for (const { game } of listed) {
      expect(game.toSnapshot()).toEqual((await repository.findById(game.id))!.toSnapshot());
    }
  });

  test("a created game already has its creator as the first player", async () => {
    const creator = (await generateTestUser()).user;

    const created = await lobby.createGame(creator.id, 2);

    const saved = await repository.findById(created.id);
    expect([...saved!.players.values()].map(({ userId, seat }) => ({ userId, seat }))).toEqual([
      { userId: creator.id, seat: 0 },
    ]);
  });

  test("a game that cannot take its creator is not created at all", async () => {
    const creator = (await generateTestUser()).user;
    const gamesBefore = await db.selectFrom("games").select("id").execute();

    await expect(lobby.createGame(creator.id, 0)).rejects.toThrow();

    expect(await db.selectFrom("games").select("id").execute()).toEqual(gamesBefore);
  });
});
