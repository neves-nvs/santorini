import { loadConfig } from "@/configs/loadConfig.ts";

const devSecretFile = "/nonexistent/.dev-jwt-secret";

function thrownMessage(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected the call to throw");
}

describe("loadConfig", () => {
  it("applies defaults", () => {
    const config = loadConfig({ JWT_SECRET: "secret" }, devSecretFile);

    expect(config).toEqual({
      port: 3000,
      jwtSecret: "secret",
      allowedOrigins: ["http://localhost:5174"],
      trustProxy: "loopback, linklocal, uniquelocal",
      registrationEnabled: true,
      authRateLimit: 20,
      rateLimit: 300,
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

  it("reads the registration flag and the login and registration limit", () => {
    const config = loadConfig(
      { JWT_SECRET: "secret", REGISTRATION_ENABLED: "false", AUTH_RATE_LIMIT: "5" },
      devSecretFile,
    );

    expect(config.registrationEnabled).toBe(false);
    expect(config.authRateLimit).toBe(5);
  });

  it("reads the request limit", () => {
    expect(loadConfig({ JWT_SECRET: "secret", RATE_LIMIT: "1000" }, devSecretFile).rateLimit).toBe(1000);
  });

  it("fails without a JWT secret outside development", () => {
    expect(() => loadConfig({ NODE_ENV: "production" }, devSecretFile)).toThrow("JWT_SECRET is not set");
  });

  it("treats empty values as unset", () => {
    const config = loadConfig(
      {
        JWT_SECRET: "secret",
        PORT: "",
        DB_HOST: "",
        DB_PORT: "",
        AUTH_RATE_LIMIT: "",
        ALLOWED_ORIGINS: "",
      },
      devSecretFile,
    );

    expect(config.port).toBe(3000);
    expect(config.db.host).toBe("localhost");
    expect(config.db.port).toBe(5432);
    expect(config.authRateLimit).toBe(20);
    expect(config.allowedOrigins).toEqual(["http://localhost:5174"]);
  });

  describe("DB_PASSWORD", () => {
    const production = { NODE_ENV: "production", JWT_SECRET: "secret" };

    it("is required in production", () => {
      expect(() => loadConfig(production, devSecretFile)).toThrow("DB_PASSWORD is not set");
    });

    it("counts as missing in production when empty", () => {
      expect(() => loadConfig({ ...production, DB_PASSWORD: "" }, devSecretFile)).toThrow("DB_PASSWORD is not set");
    });

    it("is optional in development", () => {
      const config = loadConfig({ NODE_ENV: "development", JWT_SECRET: "secret" }, devSecretFile);

      expect(config.db.password).toBeUndefined();
    });
  });

  describe.each(["PORT", "DB_PORT", "AUTH_RATE_LIMIT", "RATE_LIMIT"])("%s", (name) => {
    it.each(["abc", "12abc", "0", "-1", "1.5"])("rejects %s", (value) => {
      expect(() => loadConfig({ JWT_SECRET: "secret", [name]: value }, devSecretFile)).toThrow(
        `${name} must be a whole number`,
      );
    });
  });

  describe.each(["PORT", "DB_PORT"])("%s range", (name) => {
    it("rejects numbers above 65535", () => {
      expect(() => loadConfig({ JWT_SECRET: "secret", [name]: "65536" }, devSecretFile)).toThrow(
        `${name} must be a whole number from 1 to 65535`,
      );
    });

    it("accepts 1 and 65535", () => {
      expect(() => loadConfig({ JWT_SECRET: "secret", [name]: "1" }, devSecretFile)).not.toThrow();
      expect(() => loadConfig({ JWT_SECRET: "secret", [name]: "65535" }, devSecretFile)).not.toThrow();
    });
  });

  it("accepts an auth rate limit above 65535", () => {
    expect(loadConfig({ JWT_SECRET: "secret", AUTH_RATE_LIMIT: "100000" }, devSecretFile).authRateLimit).toBe(100000);
  });

  describe("ALLOWED_ORIGINS", () => {
    it("accepts origins with and without a port", () => {
      const config = loadConfig(
        { JWT_SECRET: "secret", ALLOWED_ORIGINS: "http://localhost:5174, https://a.example:8443,https://b.example" },
        devSecretFile,
      );

      expect(config.allowedOrigins).toEqual(["http://localhost:5174", "https://a.example:8443", "https://b.example"]);
    });

    it.each([
      ["https://a.example/", "must not end with a slash"],
      ["https://a.example/lobby", "must not have a path"],
      ["https://a.example?x=1", "must not have a path"],
      ["https://a.example:443", "must not name the default port"],
      ["http://a.example:80", "must not name the default port"],
      ["a.example", "must start with http:// or https://"],
      ["ftp://a.example", "must start with http:// or https://"],
    ])("rejects %s", (origin, reason) => {
      expect(() => loadConfig({ JWT_SECRET: "secret", ALLOWED_ORIGINS: origin }, devSecretFile)).toThrow(
        `ALLOWED_ORIGINS "${origin}" ${reason}`,
      );
    });

    it("rejects the bad origin in a list", () => {
      expect(() =>
        loadConfig({ JWT_SECRET: "secret", ALLOWED_ORIGINS: "https://a.example,https://b.example/" }, devSecretFile),
      ).toThrow('ALLOWED_ORIGINS "https://b.example/"');
    });
  });

  it("reports every problem in one error", () => {
    const env = { NODE_ENV: "production", PORT: "abc", DB_PORT: "70000", ALLOWED_ORIGINS: "https://a.example/" };

    const message = thrownMessage(() => loadConfig(env, devSecretFile));

    for (const problem of [
      "JWT_SECRET is not set",
      "PORT must",
      "DB_PORT must",
      "DB_PASSWORD is not set",
      "ALLOWED_ORIGINS",
    ]) {
      expect(message).toContain(problem);
    }
  });
});
