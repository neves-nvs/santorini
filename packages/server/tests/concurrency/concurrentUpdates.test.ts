import { GameBroadcaster } from "@/game/application/GameBroadcaster.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { GameService } from "@/game/application/GameService.ts";
import { GameViewBuilder } from "@/game/application/GameViewBuilder.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";
import { db } from "@/database.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";

describe("Commands that reach a game at the same time", () => {
  const repository = new GameRepositoryDb();
  const broadcaster = { broadcastGameUpdate: vi.fn() } as unknown as GameBroadcaster;
  const service = new GameService(repository, new GameViewBuilder(), broadcaster);

  afterEach(cleanupTestData);

  afterAll(async () => {
    await db.destroy();
  });

  async function newUsers(count: number) {
    return Promise.all(Array.from({ length: count }, async () => (await generateTestUser()).user));
  }

  test("players who join together all end up in the game", async () => {
    const [creator, ...guests] = await newUsers(4);
    const game = await repository.createNew(creator.id, 4);
    await service.addPlayer(game.id, creator.id);

    await Promise.all(guests.map((guest) => service.addPlayer(game.id, guest.id)));

    const saved = await repository.findById(game.id);
    expect([...saved!.players.values()].map((player) => player.userId).sort()).toEqual(
      [creator.id, ...guests.map((guest) => guest.id)].sort(),
    );
    expect([...saved!.players.values()].map((player) => player.seat).sort()).toEqual([0, 1, 2, 3]);
  });

  test("the same player cannot move twice by sending two moves at once", async () => {
    const [creator, guest] = await newUsers(2);
    const game = await repository.createNew(creator.id, 2);
    await service.addPlayer(game.id, creator.id);
    await service.addPlayer(game.id, guest.id);
    await service.setPlayerReady(game.id, creator.id, true);
    await service.setPlayerReady(game.id, guest.id, true);

    const placements = await Promise.allSettled([
      service.applyMove(game.id, creator.id, { type: "place_worker", position: { x: 0, y: 0 }, workerId: 1 }),
      service.applyMove(game.id, creator.id, { type: "place_worker", position: { x: 4, y: 4 }, workerId: 1 }),
    ]);

    expect(placements.filter((placement) => placement.status === "fulfilled")).toHaveLength(1);
    const refused = placements.find((placement) => placement.status === "rejected");
    expect((refused as PromiseRejectedResult).reason).toMatchObject({ code: "not_your_turn" });
  });
});
