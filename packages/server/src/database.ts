import { Kysely, LogEvent, PostgresDialect } from "kysely";
import { Pool, PoolConfig } from "pg";

import { DB_PORT } from "./configs/config.ts";
import { Database } from "./model.ts";
import logger from "./logger.ts";

const database = process.env.DB_DATABASE;
const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const PORT = DB_PORT ?? 5432;

const POOL_CONFIG: PoolConfig = {
  database,
  host,
  user,
  password,
  port: PORT,
  // Connection pool settings for concurrent WebSocket operations
  max: 20, // Maximum number of connections in pool
  min: 2, // Minimum number of connections to maintain
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout when acquiring connection
};
logger.info("Database pool", { host, port: PORT, database, user });

const pool = new Pool(POOL_CONFIG);

// Connection pool event handlers for monitoring
pool.on("connect", () => {
  logger.debug("New database connection established");
});

pool.on("error", (err) => {
  logger.error("Database connection error:", err);
});

pool.on("acquire", () => {
  logger.debug("Connection acquired from pool");
});

pool.on("release", () => {
  logger.debug("Connection released back to pool");
});

export const dialect = new PostgresDialect({
  pool,
});

// The parameters are never logged: they carry passwords and password hashes.
function logQuery(event: LogEvent) {
  const { sql } = event.query;
  const durationMs = event.queryDurationMillis;

  if (event.level === "error") {
    const error = event.error as { message?: string; code?: string };
    logger.error("Database query failed", { sql, durationMs, error: error?.message, code: error?.code });
  } else {
    logger.debug("Database query", { sql, durationMs });
  }
}

export const db = new Kysely<Database>({
  dialect,
  log: logQuery,
});

// Graceful shutdown handler (only in production, not during tests)
if (process.env.NODE_ENV !== "test") {
  process.on("SIGINT", () => {
    logger.info("Closing database connection pool...");
    void pool.end().then(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    logger.info("Closing database connection pool...");
    void pool.end().then(() => process.exit(0));
  });
}
