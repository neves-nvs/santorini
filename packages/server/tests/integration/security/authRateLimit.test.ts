import { app } from "@/app.ts";
import { config } from "@/configs/config.ts";
import request from "supertest";

describe("Auth Rate Limit Integration Tests", () => {
  test("logins and registrations share a per-client limit", async () => {
    config.authRateLimit = 3;
    const attempt = () => request(app).post("/session").send({ username: "nobody", password: "wrong-password" });

    for (let i = 0; i < 3; i++) {
      await attempt().expect(401);
    }

    await attempt().expect(429);
    await request(app).post("/users").send({ username: "nobody", password: "wrong-password" }).expect(429);
  });
});
