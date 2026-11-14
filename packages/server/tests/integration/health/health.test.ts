import { app } from "../../../src/app.ts";
import request from "supertest";

describe("Health Integration Tests", () => {
  test("200 OK without a session", async () => {
    await request(app).get("/healthz").expect(200);
  });
});
