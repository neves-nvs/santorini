import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { promises as fs } from "fs";
import path from "path";

let container: StartedPostgreSqlContainer;

function saveContainerInfoToFile(containerInfo: {host: string, port: number, database: string, user: string, password: string}) {
  const tempFilePath = path.join(__dirname, "container-info.json");
  return fs.writeFile(tempFilePath, JSON.stringify(containerInfo, null, 2));
}

export default async function globalSetup() {
  container = await new PostgreSqlContainer().start();
  const containerInfo = {
    port: container.getMappedPort(5432),
    host: container.getHost(),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  };
  console.log("Postgres container started", containerInfo);


  const { port, host, user, password } = containerInfo;
  process.env.DB_PORT = port.toString();
  process.env.DB_HOST = host;
  process.env.DB_USER = user;
  process.env.DB_PASSWORD = password;

  await saveContainerInfoToFile(containerInfo);

  global.container = container;
  console.log("Global setup complete");
}
