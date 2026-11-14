/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable("games")
    // base
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_creator_id", "integer", (col) => col.references("users.id").notNull())
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    // pre-game
    .addColumn("player_count", "integer", (col) => col.notNull())
    // in-game
    .addColumn("started_at", "timestamp")
    .addColumn("game_status", "varchar", (col) => col.notNull())
    .addColumn("game_phase", "varchar")
    .addColumn("current_player_id", "integer", (col) => col.references("users.id"))
    // post-game
    .addColumn("winner_id", "integer", (col) => col.references("users.id"))
    .addColumn("finished_at", "timestamp")
    .execute();

  await db.schema
    .createTable("players")
    .addColumn("game_id", "integer", (col) => col.references("games.id").onDelete("cascade").notNull())
    .addColumn("user_id", "integer", (col) => col.references("users.id").onDelete("cascade").notNull())
    .addPrimaryKeyConstraint("users_per_game", ["game_id", "user_id"])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable("games").execute();
}
