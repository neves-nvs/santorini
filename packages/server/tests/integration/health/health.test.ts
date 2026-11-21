import request from "supertest";

import { specApp as app } from "@tests/integration/helper/specApp.ts";
import { getTestDb } from "@tests/integration/helper/testDb.ts";

describe("Health Integration Tests", () => {
  test("/healthz is 200 OK without a session", async () => {
    await request(app).get("/healthz").expect(200);
  });

  test("/readyz is 200 OK when the database answers", async () => {
    await request(app).get("/readyz").expect(200);
  });

  test("/readyz is 503 Service Unavailable when the database does not answer", async () => {
    vi.spyOn(getTestDb(), "getExecutor").mockImplementationOnce(() => {
      throw new Error("database down");
    });

    await request(app).get("/readyz").expect(503);
  });
});
