import { Game, Player } from "@santorini/engine";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";
import { db } from "@/database.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";

describe("When the server records a game was created, started and finished", () => {
  const repository = new GameRepositoryDb();

  // The ids restart at 1 so that a player id in a game is also a user id: games.current_player_id references users.
  afterEach(cleanupTestData);

  afterAll(async () => {
    await db.destroy();
  });

  async function waitingGame(): Promise<Game> {
    const creator = (await generateTestUser()).user;
    const guest = (await generateTestUser()).user;
    const game = await repository.createNew(creator.id, 2);
    game.addPlayer(new Player(1, creator.id, 0));
    game.addPlayer(new Player(2, guest.id, 1));
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
    game.setPlayerReady(1, true);
    game.setPlayerReady(2, true);
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
    game.setPlayerReady(1, true);
    game.setPlayerReady(2, true);
    await repository.save(game);
    const [started] = await repository.findByStatus("in-progress");

    const finished = Game.fromSnapshot({
      ...game.toSnapshot(),
      status: "completed",
      winnerId: 1,
      winReason: "win_condition",
    });
    await repository.save(finished);

    const [stored] = await repository.findByStatus("completed");
    expect(stored.metadata.finishedAt).toBeInstanceOf(Date);
    expect(stored.metadata.startedAt).toEqual(started.metadata.startedAt);
  });
});
