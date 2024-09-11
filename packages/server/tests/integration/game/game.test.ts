import { createGame, findGameById } from "../../../src/game/gameRepository";

import { NewGame } from "../../../src/model";
import { app } from "../../../src/app";
import { createUserWithLogin } from "../helper/helpers";
import { db } from "../../../src/database";
import request from "supertest";
import { server } from "../../../src/main";

const newGameData = {
  player_count: 2,
  user_creator_id: 1,
  game_status: "waiting",
} as NewGame;

let jwtToken: string;

describe("Games API Integration", () => {
  beforeAll(async () => {
    jwtToken = (await createUserWithLogin()).token;
  });

  afterEach(async () => {
    await db.deleteFrom("games").execute();
    await db.deleteFrom("players").execute();
  });

  afterAll(async () => {
    await db.deleteFrom("users").execute();
    server.close();
    db.destroy();
  });

  describe("GET /games", () => {
    test("should return an empty array if there are no games", async () => {
      const response = await request(app).get("/games").set("Cookie", `token=${jwtToken}`).expect(200);

      expect(response.body).toEqual([]);
    });

    test("should return a list of games if they exist", async () => {
      await createGame(newGameData);

      const response = await request(app).get("/games").set("cookie", `token=${jwtToken}`).expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0].player_count).toBe(newGameData.player_count);
    });
  });

  describe("POST /games", () => {
    test("should create a new game and return its ID", async () => {
      const response = await request(app)
        .post("/games")
        .set("Cookie", `token=${jwtToken}`)
        .send(newGameData)
        .expect(201);

      expect(response.body).toHaveProperty("gameId");
      const game = await findGameById(response.body.gameId);
      expect(game).not.toBeNull();
      expect(game?.player_count).toBe(newGameData.player_count);
    });

    test("should return 400 if amount_of_players is missing", async () => {
      const response = await request(app).post("/games").set("Cookie", `token=${jwtToken}`).send({}).expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Amount of players must be between 2 and 4" })]),
      );
    });

    test("should return 400 if amount_of_players is out of range", async () => {
      const response = await request(app)
        .post("/games")
        .set("Cookie", `token=${jwtToken}`)
        .send({ player_count: 5 })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Amount of players must be between 2 and 4" })]),
      );
    });

    test("when all players are added to the game, the game should start", async () => {
      const response = await request(app)
        .post("/games")
        .set("Cookie", `token=${jwtToken}`)
        .send({ player_count: 2 })
        .expect(201);
      const gameId = response.body.gameId;

      await request(app).post(`/games/${gameId}/players`).set("Cookie", `token=${jwtToken}`).expect(201);

      const { token: user2Token } = await createUserWithLogin();
      const response2 = await request(app)
        .post(`/games/${gameId}/players`)
        .set("Cookie", `token=${user2Token}`)
        .expect(201);

      expect(response2.body.message).toEqual("Ready to Start");
    });
  });
});
