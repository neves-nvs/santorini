import { asSeat, Game, Player } from "@santorini/engine";

import { db } from "@/database.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";

describe("When the server records a game was created, started and finished", () => {
  const repository = new GameRepositoryDb();

  afterEach(cleanupTestData);

  afterAll(async () => {
    await db.destroy();
  });

  async function waitingGame(): Promise<Game> {
    const creator = (await generateTestUser()).user;
    const guest = (await generateTestUser()).user;
    const game = await repository.createNew(creator.id, 2);
    game.addPlayer(new Player(creator.id));
    game.addPlayer(new Player(guest.id));
    await repository.save(game);
    return game;
  }

  test("a new game has a creation time and neither a start nor a finish", async () => {
    await waitingGame();

    const [stored] = await repository.findByStatus("waiting");

    expect(stored.metadata.createdAt).toBeInstanceOf(Date);
    expect(stored.metadata.startedAt).toBeNull();
    expect(stored.metadata.finishedAt).toBeNull();
  });

  test("saving a game that just started records when, and later saves leave it alone", async () => {
    const game = await waitingGame();
    game.setPlayerReady(asSeat(0), true);
    game.setPlayerReady(asSeat(1), true);
    await repository.save(game);

    const [started] = await repository.findByStatus("in-progress");
    expect(started.metadata.startedAt).toBeInstanceOf(Date);
    expect(started.metadata.finishedAt).toBeNull();

    await repository.save(game);

    const [again] = await repository.findByStatus("in-progress");
    expect(again.metadata.startedAt).toEqual(started.metadata.startedAt);
  });

  test("saving a game that just finished records when, and keeps when it started", async () => {
    const game = await waitingGame();
    game.setPlayerReady(asSeat(0), true);
    game.setPlayerReady(asSeat(1), true);
    await repository.save(game);
    const [started] = await repository.findByStatus("in-progress");

    const finished = Game.fromSnapshot({
      ...game.toSnapshot(),
      status: "completed",
      winnerUserId: game.players[0].userId,
      winReason: "win_condition",
    });
    await repository.save(finished);

    const [stored] = await repository.findByStatus("completed");
    expect(stored.metadata.finishedAt).toBeInstanceOf(Date);
    expect(stored.metadata.startedAt).toEqual(started.metadata.startedAt);
  });
});
