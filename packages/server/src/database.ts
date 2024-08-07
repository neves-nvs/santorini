import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { Database } from "./model";

const dialect = new PostgresDialect({
  pool: new Pool({
    database: "auth",
    host: "localhost",
    user: "postgres",
    password: "postgres",
  }),
});

export const db = new Kysely<Database>({
  dialect,
});
