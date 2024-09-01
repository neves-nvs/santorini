/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema.alterTable("users").dropColumn("password").execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable("users").addColumn("password", "varchar(255)").execute();
}
