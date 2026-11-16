import { specApp as app } from "@tests/integration/helper/specApp.ts";
import { createTestUserWithLogin } from "@tests/integration/helper/helpers.ts";
import { db } from "@/database.ts";
import request from "supertest";

describe("Games HTTP error responses", () => {
  afterEach(async () => {
    await db.deleteFrom("games").execute();
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

  test("creates a two player game when the request has no body", async () => {
    const { token } = await createTestUserWithLogin();

    const response = await request(app).post("/games").set("Cookie", `token=${token}`).expect(200);

    const game = await request(app).get(`/games/${response.body.gameId}`).set("Cookie", `token=${token}`);
    expect(game.body.players).toHaveLength(1);
    const list = await request(app).get("/games").set("Cookie", `token=${token}`);
    expect(list.body[0].maxPlayers).toBe(2);
  });

  test.each([1, 5, "3", 2.5])("400 when maxPlayers is %j", async (maxPlayers) => {
    const { token } = await createTestUserWithLogin();

    const response = await request(app).post("/games").set("Cookie", `token=${token}`).send({ maxPlayers }).expect(400);

    expect(response.body).toEqual({ error: expect.stringContaining("maxPlayers") });
  });

  test.each(["abc", "0", "-1", "1.5"])("400 when the game id is %j", async (gameId) => {
    const { token } = await createTestUserWithLogin();

    await request(app).get(`/games/${gameId}`).set("Cookie", `token=${token}`).expect(400);
    await request(app).post(`/games/${gameId}/join`).set("Cookie", `token=${token}`).expect(400);
  });
});
