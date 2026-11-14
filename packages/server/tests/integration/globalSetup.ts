import { PostgreSqlContainer } from "@testcontainers/postgresql";

export type ConnectionInfo = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

async function exportPostgresInfoToEnv(containerInfo: ConnectionInfo) {
  const { port, host, database, user, password } = containerInfo;
  process.env.DB_PORT = port.toString();
  process.env.DB_HOST = host;
  process.env.DB_NAME = database;
  process.env.DB_USER = user;
  process.env.DB_PASSWORD = password;
}

export default async function globalSetup() {
  console.log("Starting PostgreSQL container...");

  const container = await new PostgreSqlContainer("postgres:18").withExposedPorts(5432).start();

  const containerInfo = {
    port: container.getMappedPort(5432),
    host: container.getHost(),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  };

  console.log("Postgres container started", containerInfo);
  await exportPostgresInfoToEnv(containerInfo);

  console.log("Global setup complete");

  return async () => {
    console.log("Stopping container");
    await container.stop();
  };
}
