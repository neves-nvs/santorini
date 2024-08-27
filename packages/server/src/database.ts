import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { Database } from "../src/model";
import { DB_PORT } from "./config";
import logger from "./logger";

const PORT = DB_PORT ?? 5432;

const POOL_CONFIG = {
  database: "test",
  host: "localhost",
  user: "test",
  password: "test",
  port: PORT,
};
logger.info("POOL_CONFIG", POOL_CONFIG);

export const dialect = new PostgresDialect({
  pool: new Pool(POOL_CONFIG),
});

export const db = new Kysely<Database>({
  dialect,
  log: ["query", "error"],
});
