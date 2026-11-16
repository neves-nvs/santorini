/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable("games")
    .addColumn("version", "integer", (col) => col.defaultTo(1).notNull())
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable("games").dropColumn("version").execute();
}
