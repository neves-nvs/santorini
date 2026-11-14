import { LOG_LEVEL } from "../../../src/configs/config.ts";
import { Writable } from "stream";
import request from "supertest";
import { transports } from "winston";

process.env.FORCE_LOGS = "true";

const logged: string[] = [];
const password = "correct-horse-battery-staple";
const username = "log-check";

describe("Logging Integration Tests", () => {
  let app: typeof import("../../../src/app.ts").app;
  let db: typeof import("../../../src/database.ts").db;

  beforeAll(async () => {
    const { default: logger } = await import("../../../src/logger.ts");
    const sink = new Writable({
      write(chunk, _encoding, done) {
        logged.push(chunk.toString());
        done();
      },
    });
    logger.add(new transports.Stream({ stream: sink }));

    ({ app } = await import("../../../src/app.ts"));
    ({ db } = await import("../../../src/database.ts"));
  });

  afterAll(async () => {
    await db.deleteFrom("users").where("username", "=", username).execute();
    await db.destroy();
  });

  test("does not write passwords, hashes or tokens to the log", async () => {
    await request(app).post("/users").send({ username, password }).expect(201);

    const agent = request.agent(app);
    const login = await agent.post("/session").send({ username, password }).expect(200);
    const token = /token=([^;]+)/.exec(String(login.headers["set-cookie"]))?.[1];
    expect(token).toBeTruthy();

    await agent.get("/me").expect(200);

    const output = logged.join("\n");
    expect(output.length).toBeGreaterThan(0);
    expect(output).not.toContain(password);
    expect(output).not.toContain(token as string);
    expect(output).not.toMatch(/\$2[aby]\$/);
    expect(output).not.toMatch(/"password(_hash|_salt)?"\s*:/);
  });

  test("redacts passwords, hashes and tokens when bodies and cookies are logged at debug level", async () => {
    const { default: logger } = await import("../../../src/logger.ts");
    logged.length = 0;
    logger.level = "debug";

    try {
      const agent = request.agent(app);
      const login = await agent.post("/session").send({ username, password }).expect(200);
      const token = /token=([^;]+)/.exec(String(login.headers["set-cookie"]))?.[1];
      await agent.get("/me").expect(200);

      const output = logged.join("\n");
      expect(output).toContain("Request body:");
      expect(output).toContain("[REDACTED]");
      expect(output).not.toContain(password);
      expect(output).not.toContain(token as string);
      expect(output).not.toMatch(/\$2[aby]\$/);
    } finally {
      logger.level = LOG_LEVEL;
    }
  });
});
