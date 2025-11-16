import { createGame, findGameById, findPlayersByGameId } from "../../../src/game/gameRepository";

import { NewGame } from "../../../src/model";
import { UserDTO } from "../../../src/users/userDTO";
import { app } from "../../../src/app";
import { createTestUserWithLogin } from "../helper/helpers";
// Removed helpers import - not needed for this simplified test
import * as gameRepository from "../../../src/game/gameRepository";
import { db } from "../../../src/database";
import request from "supertest";
// Removed server import - this test doesn't need WebSocket functionality

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
      turn_number: 1,
      placing_turns_completed: 0,
    };
  });

  afterEach(async () => {
    await db.deleteFrom("players").execute();
    await db.deleteFrom("games").execute();
    await db.deleteFrom("users").execute();
  });

  afterAll(async () => {
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

    test("creates game with correct initial status", async () => {
      const response = await request(app)
        .post("/games")
        .set("Cookie", `token=${jwtToken}`)
        .send({ player_count: 2 })
        .expect(201);
      const gameId = response.body.gameId;

      // Check that game is created with waiting status
      const game = await gameRepository.findGameById(gameId);
      expect(game?.game_status).toBe("waiting");
      expect(game?.player_count).toBe(2);
    });
  });
});
