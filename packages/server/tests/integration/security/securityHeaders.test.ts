import { app } from "../../../src/app.ts";
import { db } from "../../../src/database.ts";
import request from "supertest";

describe("Security Headers Integration Tests", () => {
  afterAll(async () => {
    await db.destroy();
  });

  test("responses carry the standard security headers and do not name the framework", async () => {
    const response = await request(app).get("/healthz").expect(200);

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  test("HSTS is left to the proxy that terminates TLS", async () => {
    const response = await request(app).get("/healthz").expect(200);

    expect(response.headers["strict-transport-security"]).toBeUndefined();
  });
});
