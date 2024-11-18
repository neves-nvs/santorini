import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { Client } from "pg";
import { promises as fs } from "fs";
import path from "path";

let container: StartedPostgreSqlContainer;

function saveContainerInfoToFile(containerInfo: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}) {
  const tempFilePath = path.join(__dirname, "container-info.json");
  return fs.writeFile(tempFilePath, JSON.stringify(containerInfo, null, 2));
}

async function isPostgresAvailable() {
  if (
    !process.env.DB_HOST ||
    !process.env.DB_PORT ||
    !process.env.DB_USER ||
    !process.env.DB_PASSWORD ||
    !process.env.DB_NAME
  ) {
    return false;
  }
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await client.connect();
    await client.end();
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Postgres connection error", error.message);
    return false;
  }
}

async function exportPostgresInfoToEnv(containerInfo: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}) {
  const { port, host, user, password } = containerInfo;
  process.env.DB_PORT = port.toString();
  process.env.DB_HOST = host;
  process.env.DB_USER = user;
  process.env.DB_PASSWORD = password;
  process.env.DB_NAME = containerInfo.database;
}

export default async function globalSetup() {
  let containerInfo;

  if (await isPostgresAvailable()) {
    console.log("Postgres connection is available, skipping container setup");
    containerInfo = {
      port: 5432,
      host: process.env.DB_HOST || "postgres",
      database: process.env.DB_NAME || "testedb",
      user: process.env.DB_USER || "user",
      password: process.env.DB_PASSWORD || "password",
    };
  } else {
    container = await new PostgreSqlContainer().start();
    containerInfo = {
      port: container.getMappedPort(5432),
      host: container.getHost(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    };
    console.log("Postgres container started", containerInfo);
  }

  await saveContainerInfoToFile(containerInfo);
  await exportPostgresInfoToEnv(containerInfo);

  if (container) {
    global.container = container;
  }

  console.log("Global setup complete");
}
