import { app } from "../../../src/app.ts";
import { db } from "../../../src/database.ts";
import request from "supertest";

describe("CORS Integration Tests", () => {
  afterAll(async () => {
    await db.destroy();
  });

  test("allows credentialed requests from a configured origin", async () => {
    const response = await request(app).get("/me").set("Origin", "http://localhost:5174");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  test("does not allow requests from an unknown origin", async () => {
    const response = await request(app).get("/me").set("Origin", "https://evil.example");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
