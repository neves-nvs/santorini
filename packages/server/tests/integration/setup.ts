import * as path from "path";

import { Client, ClientConfig, Pool } from "pg";
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
} from "kysely";

import { ConnectionInfo } from "./globalSetup";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";


async function loadContainerInfoFromEnv(): Promise<ConnectionInfo> {
  return {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
  };
}

// Set unique port for each Jest worker BEFORE any imports that might start the server
// Use random port assignment since JEST_WORKER_ID seems to be always 1
const randomPort = Math.floor(Math.random() * 1000) + 4000; // Random port between 4000-4999
const workerId = process.env.JEST_WORKER_ID || '1';
console.log(`Setting PORT to ${randomPort} for worker ${workerId}`);
process.env.PORT = randomPort.toString();

const newDbName = `test_db_${randomUUID().replace(/-/g, "_")}`;
process.env.DB_DATABASE = newDbName;

async function setup() {
  // console.log(`JEST_WORKER_ID: ${process.env.JEST_WORKER_ID}`);

  // const containerInfo = await loadContainerInfoFromFile();
  const containerInfo = await loadContainerInfoFromEnv();
  const { port, host, database, user, password } = containerInfo;

  // const client = new Client(containerInfo);
  const client = new Client({
    host,
    port,
    database,
    user,
    password,
  } as ClientConfig);

  try {
    await client.connect();

    await client.query(`CREATE DATABASE ${newDbName};`);
    console.log("Database created", { newDbName });
    process.env.DB_DATABASE = newDbName;

    const result = await client.query(
      "SELECT has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_db;",
    );
    if (!result.rows[0].can_create_db) {
      throw new Error("User does not have permission to create database");
    }
  } catch (e) {
    console.log("Error", e);
  } finally {
    await client.end();
  }

  /* -------------------------------------------------------------------------- */
  /*                                  MIGRATION                                 */
  /* -------------------------------------------------------------------------- */

  const pool = new Pool({
    host,
    port,
    database: newDbName,
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

  try {
    const { error } = await migrator.migrateToLatest();

    if (error) {
      console.error("Migration failed", { error });
      throw new Error("Migration failed");
    }
  } catch (e) {
    console.log(e);
    throw e;
  } finally {
    await db.destroy();
  }
}

module.exports = async () => {
  await setup();
};
