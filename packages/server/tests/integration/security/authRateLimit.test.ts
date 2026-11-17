import { app } from "@/app.ts";
import { config } from "@/configs/config.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";
import request from "supertest";

describe("Auth Rate Limit Integration Tests", () => {
  const login = (username: string, password: string) => request(app).post("/session").send({ username, password });

  test("successful logins do not use up the limit", async () => {
    const { userData } = await generateTestUser();
    config.authRateLimit = 3;

    for (let i = 0; i < 5; i++) {
      await login(userData.username, userData.password).expect(200);
    }
  });

  test("failed logins are limited per username", async () => {
    config.authRateLimit = 3;

    for (let i = 0; i < 3; i++) {
      await login("nobody", "wrong-password").expect(401);
    }

    await login("nobody", "wrong-password").expect(429);
    await login("somebody-else", "wrong-password").expect(401);
  });

  test("the same name in another case counts against the same limit", async () => {
    config.authRateLimit = 3;

    for (const username of ["Casey", "casey", " CASEY "]) {
      await login(username, "wrong-password").expect(401);
    }

    await login("cAsEy", "wrong-password").expect(429);
  });

  test("registrations have a limit of their own", async () => {
    config.authRateLimit = 2;
    const attempt = () => request(app).post("/users").set("X-Forwarded-For", "203.0.113.50").send({});

    await attempt().expect(400);
    await attempt().expect(400);
    await attempt().expect(429);
  });
});
