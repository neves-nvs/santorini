import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { Database } from "@src/model";
import { DB_PORT } from "./config";

const PORT = DB_PORT ?? 5432;

const dialect = new PostgresDialect({
  pool: new Pool({
    database: "auth",
    host: "localhost",
    user: "postgres",
    password: "postgres",
    port: PORT,
  }),
});

export const db = new Kysely<Database>({
  dialect,
  log: ["query", "error"],
});
