import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { Database } from "../src/model";
import logger from "./logger";
import { DB_PORT } from "./configs/config";

const database = process.env.DB_DATABASE;
const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const PORT = DB_PORT ?? 5432;

const POOL_CONFIG = {
  database,
  host,
  user,
  password,
  port: PORT,
};
logger.info("POOL_CONFIG", POOL_CONFIG);

export const dialect = new PostgresDialect({
  pool: new Pool(POOL_CONFIG),
});

export const db = new Kysely<Database>({
  dialect,
  // log: ["query", "error"],
});
