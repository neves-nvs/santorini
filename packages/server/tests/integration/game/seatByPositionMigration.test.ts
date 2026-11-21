/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from "kysely";

import { db } from "@/database.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import * as migration from "@/migrations/1795132800000_seat_by_position.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";

describe("The migration that identifies a player by seat", () => {
  const untyped = db as unknown as Kysely<any>;

  // The old current_player_id and winner_id still reference users, so the users must have the ids 1 and 2 that the
  // old player ids (the seat plus one) stored in them.
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  afterAll(async () => {
    await db.destroy();
  });

  async function twoUsersAndAGame() {
    const first = (await generateTestUser()).user;
    const second = (await generateTestUser()).user;
    const { id: gameId } = await new GameRepositoryDb().createNew(first.id, 2);
    await migration.down(untyped);
    return { first, second, gameId };
  }

  async function seat(gameId: number, userIds: number[]) {
    for (const [position, userId] of userIds.entries()) {
      await untyped
        .insertInto("players")
        .values({ game_id: gameId, user_id: userId, seat: position, is_ready: true })
        .execute();
    }
  }

  test("turns the player id of whose turn it is into a seat", async () => {
    const { first, second, gameId } = await twoUsersAndAGame();
    await seat(gameId, [first.id, second.id]);
    await untyped
      .updateTable("games")
      .set({ game_status: "in-progress", game_phase: "moving", current_player_id: 2 })
      .where("id", "=", gameId)
      .execute();

    await migration.up(untyped);

    const game = await db.selectFrom("games").where("id", "=", gameId).select("current_seat").executeTakeFirstOrThrow();
    expect(game.current_seat).toBe(1);
  });

  test("turns the winning player id into the user who sat there", async () => {
    const { first, second, gameId } = await twoUsersAndAGame();
    await seat(gameId, [second.id, first.id]);
    await untyped
      .updateTable("games")
      .set({ game_status: "completed", winner_id: 1, win_reason: "win_condition" })
      .where("id", "=", gameId)
      .execute();

    await migration.up(untyped);

    const game = await db
      .selectFrom("games")
      .where("id", "=", gameId)
      .select("winner_user_id")
      .executeTakeFirstOrThrow();
    expect(game.winner_user_id).toBe(second.id);
  });

  test("moves the owner of each worker to a seat and leaves the other pieces alone", async () => {
    const { first, second, gameId } = await twoUsersAndAGame();
    await seat(gameId, [first.id, second.id]);
    await untyped
      .insertInto("pieces")
      .values([
        { game_id: gameId, piece_id: 1, x: 0, y: 0, height: 0, type: "worker", owner: "1" },
        { game_id: gameId, piece_id: 1, x: 4, y: 4, height: 0, type: "worker", owner: "2" },
        { game_id: gameId, piece_id: 1, x: 2, y: 2, height: 1, type: "building", owner: "none" },
      ])
      .execute();

    await migration.up(untyped);

    const pieces = await db.selectFrom("pieces").where("game_id", "=", gameId).select("owner").orderBy("x").execute();
    expect(pieces.map(({ owner }) => owner)).toEqual(["0", "none", "1"]);
  });
});
