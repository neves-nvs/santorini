/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable("lobbies")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_creator_id", "integer", (col) => col.references("users.id").onDelete("cascade").notNull())
    .addColumn("max_players", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  await db.schema
    .createTable("lobby_players")
    .addColumn("lobby_id", "integer", (col) => col.references("lobbies.id").onDelete("cascade").notNull())
    .addColumn("user_id", "integer", (col) => col.references("users.id").onDelete("cascade").notNull())
    .addColumn("seat", "integer", (col) => col.notNull())
    .addColumn("is_ready", "boolean", (col) => col.defaultTo(false).notNull())
    .addPrimaryKeyConstraint("users_per_lobby", ["lobby_id", "user_id"])
    .addUniqueConstraint("seat_per_lobby", ["lobby_id", "seat"])
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable("lobby_players").execute();
  await db.schema.dropTable("lobbies").execute();
}
