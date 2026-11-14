import { Kysely, PostgresDialect } from "kysely";
import { Pool, PoolConfig } from "pg";
import { Database } from "./model.ts";
import { config } from "./configs/config.ts";
import logger from "./logger.ts";

const { database, host, user, password, port } = config.db;

const POOL_CONFIG: PoolConfig = {
  database,
  host,
  user,
  password,
  port,
  // Connection pool settings for concurrent WebSocket operations
  max: 20, // Maximum number of connections in pool
  min: 2, // Minimum number of connections to maintain
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout when acquiring connection
};
logger.info("Database pool", { host, port, database, user });

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

export const db = new Kysely<Database>({
  dialect,
  // log: ["query", "error"],
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
