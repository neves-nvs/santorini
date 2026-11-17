import { app } from "@/app.ts";
import { config } from "@/configs/config.ts";
import { db } from "@/database.ts";
import request from "supertest";

const SIMULTANEOUS_REQUESTS = 10;
const ROUNDS = 5;

describe("Simultaneous registrations of one username", () => {
  const previousLimit = config.authRateLimit;

  beforeAll(() => {
    config.authRateLimit = SIMULTANEOUS_REQUESTS * ROUNDS;
  });

  afterAll(async () => {
    config.authRateLimit = previousLimit;
    await db.deleteFrom("users").execute();
    await db.destroy();
  });

  test("let exactly one request create the user and answer the others 409", async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const username = `racer-${round}`;

      const responses = await Promise.all(
        Array.from({ length: SIMULTANEOUS_REQUESTS }, () =>
          request(app).post("/users").send({ username, password: "password123" }),
        ),
      );

      const statuses = responses.map((response) => response.status);
      expect(statuses.filter((status) => status === 201)).toHaveLength(1);
      expect(statuses.filter((status) => status === 409)).toHaveLength(SIMULTANEOUS_REQUESTS - 1);
    }
  });
});
