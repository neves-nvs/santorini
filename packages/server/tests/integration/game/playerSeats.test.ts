import { db } from "@/database.ts";
import { GameBroadcaster } from "@/game/application/GameBroadcaster.ts";
import { GameService } from "@/game/application/GameService.ts";
import { GameViewBuilder } from "@/game/application/GameViewBuilder.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";

describe("A seat is the position of a player in the order of joining", () => {
  const repository = new GameRepositoryDb();
  const broadcaster = { broadcastGameUpdate: vi.fn() } as unknown as GameBroadcaster;
  const service = new GameService(repository, new GameViewBuilder(), broadcaster);

  afterEach(cleanupTestData);

  afterAll(async () => {
    await db.destroy();
  });

  // Sorted by id, so a test can say which user has the lower and which the higher id
  async function newUsers(count: number) {
    const users = await Promise.all(Array.from({ length: count }, async () => (await generateTestUser()).user));
    return users.sort((a, b) => a.id - b.id);
  }

  async function usersBySeat(gameId: Parameters<GameRepositoryDb["findById"]>[0]) {
    const game = await repository.findById(gameId);
    return game!.players.map((player) => player.userId);
  }

  test("the player who joined first is the first seat, also when another user has a lower id", async () => {
    const [lowerId, higherId] = await newUsers(2);
    const game = await repository.createNew(higherId.id, 2);

    await service.addPlayer(game.id, higherId.id);
    await service.addPlayer(game.id, lowerId.id);

    expect(await usersBySeat(game.id)).toEqual([higherId.id, lowerId.id]);
  });

  test("the player who joined first moves first", async () => {
    const [lowerId, higherId] = await newUsers(2);
    const game = await repository.createNew(higherId.id, 2);
    await service.addPlayer(game.id, higherId.id);
    await service.addPlayer(game.id, lowerId.id);

    await service.setPlayerReady(game.id, higherId.id, true);
    await service.setPlayerReady(game.id, lowerId.id, true);

    const started = await repository.findById(game.id);
    expect(started!.players[started!.currentSeat!].userId).toBe(higherId.id);
    await expect(
      service.applyMove(game.id, higherId.id, { type: "place_worker", position: { x: 0, y: 0 }, workerId: 1 }),
    ).resolves.toBeDefined();
  });

  test("the game that answers a join has the same seats as the game loaded afterwards", async () => {
    const [lowerId, higherId] = await newUsers(2);
    const game = await repository.createNew(higherId.id, 2);
    await service.addPlayer(game.id, higherId.id);

    const { game: answered } = await service.addPlayer(game.id, lowerId.id);

    expect(answered.players.map((player) => player.userId)).toEqual(await usersBySeat(game.id));
  });

  test("a player who leaves closes the gap, and the next player takes the last seat", async () => {
    const [first, second, third, fourth] = await newUsers(4);
    const game = await repository.createNew(first.id, 3);
    for (const user of [first, second, third]) {
      await service.addPlayer(game.id, user.id);
    }

    await service.removePlayer(game.id, first.id);
    await service.addPlayer(game.id, fourth.id);

    expect(await usersBySeat(game.id)).toEqual([second.id, third.id, fourth.id]);
  });
});
