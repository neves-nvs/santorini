import { Writable } from "stream";
import request from "supertest";
import { transports } from "winston";

process.env.FORCE_LOGS = "true";
process.env.LOG_LEVEL = "debug";

const logged: string[] = [];
const password = "correct-horse-battery-staple";
const username = "log-check";

describe("Logging Integration Tests", () => {
  let app: typeof import("../../../src/app").app;
  let db: typeof import("../../../src/database").db;

  beforeAll(async () => {
    const { default: logger } = await import("../../../src/logger");
    const sink = new Writable({
      write(chunk, _encoding, done) {
        logged.push(chunk.toString());
        done();
      },
    });
    logger.add(new transports.Stream({ stream: sink }));

    ({ app } = await import("../../../src/app"));
    ({ db } = await import("../../../src/database"));
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
    expect(output).not.toMatch(/"password(_hash|_salt)?"\s*:\s*"(?!\[REDACTED\])/);
    expect(output).toContain("[REDACTED]");
    expect(output).toContain(username);
  });
});
