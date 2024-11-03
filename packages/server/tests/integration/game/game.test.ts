import { createGame, findGameById } from "../../../src/game/gameRepository";

import { NewGame } from "../../../src/model";
import { UserDTO } from "../../../src/users/userDTO";
import { app } from "../../../src/app";
import { createTestUserWithLogin } from "../helper/helpers";
import { db } from "../../../src/database";
import request from "supertest";
import { server } from "../../../src/main";

let newGameDTO: { player_count: number };
let newGameData: NewGame;
let user: UserDTO;
let jwtToken: string;

describe("Games API Integration", () => {
  beforeEach(async () => {
    const createUserResponse = await createTestUserWithLogin();
    user = createUserResponse.user;
    jwtToken = createUserResponse.token;

    newGameDTO = {
      player_count: 2,
    };

    newGameData = {
      created_at: new Date().toISOString(),
      player_count: newGameDTO.player_count,
      user_creator_id: user.id,
      game_status: "waiting",
    };
  });

  afterEach(async () => {
    await db.deleteFrom("players").execute();
    await db.deleteFrom("games").execute();
    await db.deleteFrom("users").execute();
  });

  afterAll(async () => {
    server.close();
    await db.destroy();
  });

  describe("GET /games", () => {
    test("returns empty array when no games exist", async () => {
      const response = await request(app).get("/games").set("Cookie", `token=${jwtToken}`).expect(200);

      expect(response.body).toEqual([]);
    });

    test("returns list of games if they exist", async () => {
      await createGame(newGameData);

      const response = await request(app).get("/games").set("cookie", `token=${jwtToken}`).expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0].player_count).toBe(newGameData.player_count);
    });
  });

  describe("POST /games", () => {
    test("creates new game and returns game ID", async () => {
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

    test("400 Bad Request if player count is missing", async () => {
      const response = await request(app).post("/games").set("Cookie", `token=${jwtToken}`).send({}).expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Amount of players must be between 2 and 4" })]),
      );
    });

    test("400 Bad Request if player count is out of range", async () => {
      const response = await request(app)
        .post("/games")
        .set("Cookie", `token=${jwtToken}`)
        .send({ player_count: 5 })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Amount of players must be between 2 and 4" })]),
      );
    });

    test("starts game when all players are added", async () => {
      const response = await request(app)
        .post("/games")
        .set("Cookie", `token=${jwtToken}`)
        .send({ player_count: 2 })
        .expect(201);
      const gameId = response.body.gameId;

      await request(app).post(`/games/${gameId}/players`).set("Cookie", `token=${jwtToken}`).expect(201);

      const { token: user2Token } = await createTestUserWithLogin();
      const response2 = await request(app)
        .post(`/games/${gameId}/players`)
        .set("Cookie", `token=${user2Token}`)
        .expect(201);

      expect(response2.body.message).toEqual("Ready to Start");
    });
  });
});
