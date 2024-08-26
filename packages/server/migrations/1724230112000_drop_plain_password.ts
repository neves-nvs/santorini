import { Kysely } from "kysely";
import { db } from "../src/database";

export async function up(db: Kysely<any>) {
  await db.schema.alterTable("users").dropColumn("password").execute();
}

export async function down() {
  await db.schema
    .alterTable("users")
    .addColumn("password", "varchar(255)")
    .execute();
}
