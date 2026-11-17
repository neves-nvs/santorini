/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from "kysely";

// NOT VALID: the format is enforced for every new or changed row, and a legacy row that breaks it still logs in.
export async function up(db: Kysely<any>) {
  await sql`update users set username = lower(trim(username))`.execute(db);
  await sql`
    alter table users
      add constraint users_username_format check (username ~ '^[a-z0-9_-]{3,32}$') not valid
  `.execute(db);
}

export async function down(db: Kysely<any>) {
  await sql`alter table users drop constraint users_username_format`.execute(db);
}
