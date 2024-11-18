import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { Client } from "pg";
import { promises as fs } from "fs";
import path from "path";

type ConnectionInfo = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

let container: StartedPostgreSqlContainer;

const defaultConnectionInfo: ConnectionInfo = {
  host: "127.0.0.1",
  port: 5432,
  database: "postgres",
  user: "user",
  password: "password",
};

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


async function isPostgresAvailable(connectionInfo: ConnectionInfo) {
  const client = new Client(connectionInfo);

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

async function exportPostgresInfoToEnv(containerInfo: ConnectionInfo) {
  const { port, host, user, password } = containerInfo;
  process.env.DB_PORT = port.toString();
  process.env.DB_HOST = host;
  process.env.DB_USER = user;
  process.env.DB_PASSWORD = password;
  process.env.DB_NAME = containerInfo.database;
}

export default async function globalSetup() {
  let containerInfo;

  if (await isPostgresAvailable(defaultConnectionInfo)) {
    console.log("Postgres connection is available, skipping container setup");
    containerInfo = defaultConnectionInfo;
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
    global.container=container;
  }

  // await saveContainerInfoToFile(containerInfo);
  await exportPostgresInfoToEnv(containerInfo);

  console.log("Global setup complete");
}
