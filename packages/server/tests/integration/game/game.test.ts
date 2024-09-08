import { app, server } from "../../../src/main";
import { createGame, findGameById } from "../../../src/game/gameRepository";

import { NewGame } from "../../../src/model";
import { UserDTO } from "./../../../src/users/userDTO";
import { db } from "../../../src/database";
import request from "supertest";

const userData = {
  username: "testuser",
  password: "password123",
};

const newGameData = {
  player_count: 2,
  user_creator_id: 1,
  game_status: "waiting",
} as NewGame;

let jwtToken: string;
let user: UserDTO;

describe("Games API Integration", () => {
  beforeAll(async () => {
    const registerResponse = await request(app).post("/users").send(userData).expect(201);
    user = registerResponse.body as UserDTO;

    const loginResponse = await request(app)
      .post("/session")
      .send({ username: userData.username, password: userData.password })
      .expect(200);

    const cookieHeader = loginResponse.headers["set-cookie"];
    console.log(cookieHeader);
    const cookies = cookieHeader.toString().split(";");
    jwtToken = cookies.find((cookie) => cookie.startsWith("token=")) as string;
  });

  afterEach(async () => {
    await db.deleteFrom("games").execute();
    await db.deleteFrom("players").execute();
  });

  afterAll(() => {
    server.close();
    db.destroy();
  });

  describe("GET /games", () => {
    test("should return an empty array if there are no games", async () => {
      const response = await request(app).get("/games").set("Cookie", jwtToken).expect(200);

      expect(response.body).toEqual([]);
    });

    test("should return a list of games if they exist", async () => {
      await createGame(newGameData);

      const response = await request(app).get("/games").set("Cookie", jwtToken).expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0].player_count).toBe(newGameData.player_count);
    });
  });

  describe("POST /games", () => {
    test("should create a new game and return its ID", async () => {
      const response = await request(app).post("/games").set("Cookie", jwtToken).send(newGameData).expect(201);

      expect(response.body).toHaveProperty("gameId");
      const game = await findGameById(response.body.gameId);
      expect(game).not.toBeNull();
      expect(game?.player_count).toBe(newGameData.player_count);
    });

    test("should return 400 if amount_of_players is missing", async () => {
      const response = await request(app).post("/games").set("Cookie", jwtToken).send({}).expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Amount of players must be between 2 and 4" })]),
      );
    });

    test("should return 400 if amount_of_players is out of range", async () => {
      const response = await request(app)
        .post("/games")
        .set("Cookie", jwtToken)
        .send({ amountOfPlayers: 5 })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ msg: "Amount of players must be between 2 and 4" })]),
      );
    });
  });
});
