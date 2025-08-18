/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable("pieces")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("game_id", "integer", (col) => col.references("games.id").onDelete("cascade").notNull())
    .addColumn("piece_id", "integer", (col) => col.notNull())
    .addColumn("x", "integer", (col) => col.notNull())
    .addColumn("y", "integer", (col) => col.notNull())
    .addColumn("height", "integer", (col) => col.notNull())
    .addColumn("type", "varchar", (col) => col.notNull())
    .addColumn("owner", "varchar", (col) => col.notNull())
    .execute();

  // Create index for efficient game queries
  await db.schema
    .createIndex("pieces_game_id_index")
    .on("pieces")
    .column("game_id")
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable("pieces").execute();
}
