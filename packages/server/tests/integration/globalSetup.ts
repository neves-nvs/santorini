import { Pool } from "pg";
import { Kysely, PostgresDialect, Migrator, FileMigrationProvider } from "kysely";
import * as path from "path";
import { promises as fs } from "fs";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { server } from "../../src/main";

let container: StartedPostgreSqlContainer;

export default async function globalSetup() {
  container = await new PostgreSqlContainer().start();

  const port = container.getMappedPort(5432);
  const host = container.getHost();
  const database = container.getDatabase();
  const user = container.getUsername();
  const password = container.getPassword();

  const pool = new Pool({
    host,
    port,
    database,
    user,
    password,
  });

  const db = new Kysely({
    dialect: new PostgresDialect({
      pool,
    }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.resolve(__dirname, "../../migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  if (error) {
    console.error("Migration failed", error);
    throw error;
  }

  console.log("Migrations applied:", results);

  process.env.TEST_POSTGRES_PORT = port.toString();

  globalThis.server = server;
}
