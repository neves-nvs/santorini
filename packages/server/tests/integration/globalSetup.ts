import * as path from "path";

import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from "kysely";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { Pool } from "pg";
import { promises as fs } from "fs";

let container: StartedPostgreSqlContainer;

export default async function globalSetup() {
  container = await new PostgreSqlContainer().start();

  const port = container.getMappedPort(5432);
  const host = container.getHost();
  const database = container.getDatabase();
  const user = container.getUsername();
  const password = container.getPassword();
  console.log("Postgres container started", { port, host, database, user, password });

  const pool = new Pool({
    host,
    port,
    database,
    user,
    password,
  });
  console.log("Pool created");

  const db = new Kysely({
    dialect: new PostgresDialect({
      pool,
    }),
  });
  console.log("Database created");

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.resolve(__dirname, "../../migrations"),
    }),
  });
  console.log("Migrator created");

  const { error, results } = await migrator.migrateToLatest();

  if (error) {
    console.error("Migration failed", { error });
    throw new Error("Migration failed");
  }

  console.log("Migrations applied", { results });

  await db.destroy();

  process.env.DB_PORT = port.toString();
  process.env.DB_HOST = host;
  process.env.DB_DATABASE = database;
  process.env.DB_USER = user;
  process.env.DB_PASSWORD = password;

  globalThis.container = container;

  console.log("Global setup complete");
}
