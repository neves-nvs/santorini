/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable("users")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("username", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("password", "varchar(255)")
    .addColumn("google_id", "varchar(255)", (col) => col.unique())
    .addColumn("display_name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable("users").execute();
}
