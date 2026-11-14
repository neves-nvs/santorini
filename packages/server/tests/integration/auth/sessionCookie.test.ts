import { app } from "../../../src/app.ts";
import { generateTestUser } from "../helper/helpers.ts";
import request from "supertest";

describe("Session Cookie Integration Tests", () => {
  let credentials: { username: string; password: string };

  beforeAll(async () => {
    credentials = (await generateTestUser()).userData;
  });

  function tokenCookie(response: request.Response): string {
    return (response.headers["set-cookie"] as unknown as string[]).find((cookie) =>
      cookie.startsWith("token="),
    ) as string;
  }

  test("is HttpOnly and SameSite=Lax but not Secure over plain HTTP", async () => {
    const response = await request(app).post("/session").send(credentials).expect(200);

    expect(tokenCookie(response)).toContain("HttpOnly");
    expect(tokenCookie(response)).toContain("SameSite=Lax");
    expect(tokenCookie(response)).not.toContain("Secure");
  });

  test("is Secure when the proxy forwarded https", async () => {
    const response = await request(app)
      .post("/session")
      .set("X-Forwarded-Proto", "https")
      .send(credentials)
      .expect(200);

    expect(tokenCookie(response)).toContain("Secure");
  });

  test("is cleared with the same attributes", async () => {
    const response = await request(app).post("/logout").set("X-Forwarded-Proto", "https").expect(200);

    expect(tokenCookie(response)).toMatch(/^token=;/);
    expect(tokenCookie(response)).toContain("Secure");
    expect(tokenCookie(response)).toContain("SameSite=Lax");
  });
});
