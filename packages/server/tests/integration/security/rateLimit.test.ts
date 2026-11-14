import { app } from "../../../src/app.ts";
import request from "supertest";

describe("Rate Limit Integration Tests", () => {
  async function remainingFor(clientAddress: string): Promise<number> {
    const response = await request(app).get("/me").set("X-Forwarded-For", clientAddress);
    return Number(response.headers["ratelimit-remaining"]);
  }

  test("counts requests per forwarded client address", async () => {
    const first = await remainingFor("203.0.113.10");
    const second = await remainingFor("203.0.113.10");
    const otherClient = await remainingFor("203.0.113.11");

    expect(second).toBe(first - 1);
    expect(otherClient).toBe(first);
  });
});
