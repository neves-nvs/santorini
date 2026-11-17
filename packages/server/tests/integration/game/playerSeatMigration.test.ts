/* eslint-disable @typescript-eslint/no-explicit-any */
import * as migration from "@/migrations/1795046400000_add_player_seat.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { Kysely } from "kysely";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";
import { db } from "@/database.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";

describe("The migration that stores the seat of a player", () => {
  afterEach(cleanupTestData);

  afterAll(async () => {
    await db.destroy();
  });

  test("gives the players of an existing game the seats that their user ids implied", async () => {
    const users = [];
    for (let created = 0; created < 3; created++) {
      users.push((await generateTestUser()).user);
    }
    const [first, second, third] = users;
    const { id: gameId } = await new GameRepositoryDb().createNew(first.id, 3);
    const untyped = db as unknown as Kysely<any>;

    await migration.down(untyped);
    for (const user of [third, first, second]) {
      await untyped.insertInto("players").values({ game_id: gameId, user_id: user.id, is_ready: false }).execute();
    }
    await migration.up(untyped);

    const players = await db
      .selectFrom("players")
      .where("game_id", "=", gameId)
      .select(["user_id", "seat"])
      .orderBy("seat")
      .execute();
    expect(players).toEqual([
      { user_id: first.id, seat: 0 },
      { user_id: second.id, seat: 1 },
      { user_id: third.id, seat: 2 },
    ]);
  });
});
