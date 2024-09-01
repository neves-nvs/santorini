import { Pool } from "pg";
import { Kysely, PostgresDialect, Migrator, FileMigrationProvider } from "kysely";
import * as path from "path";
import { promises as fs } from "fs";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import logger from "../../src/logger";

let container: StartedPostgreSqlContainer;

export default async function globalSetup() {
  container = await new PostgreSqlContainer().start();

  const port = container.getMappedPort(5432);
  const host = container.getHost();
  const database = container.getDatabase();
  const user = container.getUsername();
  const password = container.getPassword();
  logger.info("Postgres container started", { port, host, database, user, password });

  const pool = new Pool({
    host,
    port,
    database,
    user,
    password,
  });
  logger.info("Pool created");

  const db = new Kysely({
    dialect: new PostgresDialect({
      pool,
    }),
  });
  logger.info("Database created");

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.resolve(__dirname, "../../migrations"),
    }),
  });
  logger.info("Migrator created");

  const { error, results } = await migrator.migrateToLatest();

  if (error) {
    logger.error("Migration failed", { error });
    throw error;
  }

  logger.info("Migrations applied", { results });

  await db.destroy();

  process.env.DB_PORT = port.toString();
  process.env.DB_HOST = host;
  process.env.DB_DATABASE = database;
  process.env.DB_USER = user;
  process.env.DB_PASSWORD = password;

  globalThis.container = container;
}
