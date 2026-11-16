/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema.alterTable("users").dropColumn("google_id").execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable("users")
    .addColumn("google_id", "varchar(255)", (col) => col.unique())
    .execute();
}
