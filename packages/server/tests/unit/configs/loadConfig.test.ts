import { loadConfig } from "../../../src/configs/loadConfig.ts";

const devSecretFile = "/nonexistent/.dev-jwt-secret";

describe("loadConfig", () => {
  it("applies defaults", () => {
    const config = loadConfig({ JWT_SECRET: "secret" }, devSecretFile);

    expect(config).toEqual({
      port: 3000,
      jwtSecret: "secret",
      allowedOrigins: ["http://localhost:5174"],
      trustProxy: "loopback, linklocal, uniquelocal",
      google: { clientId: undefined, clientSecret: undefined },
      db: { host: "localhost", port: 5432, user: "postgres", database: "postgres", password: undefined },
      logging: { level: "http", httpFormat: "dev", force: false },
    });
  });

  it("reads values from the environment", () => {
    const config = loadConfig(
      {
        JWT_SECRET: "secret",
        PORT: "4000",
        ALLOWED_ORIGINS: "https://a.example, https://b.example",
        DB_HOST: "db",
        DB_PORT: "6543",
        DB_USER: "santorini",
        DB_DATABASE: "games",
        DB_PASSWORD: "pw",
        LOG_LEVEL: "debug",
        LOG_FORMAT: "combined",
        FORCE_LOGS: "true",
      },
      devSecretFile,
    );

    expect(config.port).toBe(4000);
    expect(config.allowedOrigins).toEqual(["https://a.example", "https://b.example"]);
    expect(config.db).toEqual({ host: "db", port: 6543, user: "santorini", database: "games", password: "pw" });
    expect(config.logging).toEqual({ level: "debug", httpFormat: "combined", force: true });
  });

  it("reads the proxies to trust", () => {
    expect(loadConfig({ JWT_SECRET: "secret", TRUST_PROXY: "2" }, devSecretFile).trustProxy).toBe(2);
    expect(loadConfig({ JWT_SECRET: "secret", TRUST_PROXY: "10.0.0.0/8" }, devSecretFile).trustProxy).toBe(
      "10.0.0.0/8",
    );
  });

  it("fails without a JWT secret outside development", () => {
    expect(() => loadConfig({ NODE_ENV: "production" }, devSecretFile)).toThrow("JWT_SECRET is not set");
  });
});
