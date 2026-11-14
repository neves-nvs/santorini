import { app } from "../../../src/app.ts";
import { createTestUserWithLogin } from "../helper/helpers.ts";
import { db } from "../../../src/database.ts";
import request from "supertest";

describe("Games HTTP error responses", () => {
  afterEach(async () => {
    await db.deleteFrom("users").execute();
  });

  afterAll(async () => {
    await db.destroy();
  });

  test("404 with the user-facing message when the game does not exist", async () => {
    const { token } = await createTestUserWithLogin();

    const response = await request(app).get("/games/999999").set("Cookie", `token=${token}`).expect(404);

    expect(response.body).toEqual({ error: "Game not found" });
  });
});
