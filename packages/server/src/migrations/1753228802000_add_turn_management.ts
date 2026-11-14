/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable("games")
    .addColumn("turn_number", "integer", (col) => col.defaultTo(1).notNull())
    .addColumn("placing_turns_completed", "integer", (col) => col.defaultTo(0).notNull())
    .addColumn("win_reason", "varchar")
    .addColumn("completed_at", "timestamp")
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable("games")
    .dropColumn("turn_number")
    .dropColumn("placing_turns_completed")
    .dropColumn("win_reason")
    .dropColumn("completed_at")
    .execute();
}
