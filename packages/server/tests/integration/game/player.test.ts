import { addPlayerToGame, createGame, findPlayersByGameId } from "../../../src/game/gameRepository";

import { NewGame } from "../../../src/model";
import { UserDTO } from "./../../../src/users/userDTO";
import { app } from "../../../src/app";
import { createTestUserWithLogin } from "../helper/helpers";
import { db } from "../../../src/database";
import logger from "../../../src/logger";
import request from "supertest";
import { server } from "../../../src/main";

const userData = {
  username: "testuser",
  password: "password123",
};

let newGameData = {
  player_count: 2,
  game_status: "waiting",
} as NewGame;

let jwtToken: string;
let user: UserDTO;

describe("Players in Game API", () => {
  beforeEach(async () => {
    const registerResponse = await request(app).post("/users").send(userData).expect(201);
    user = registerResponse.body as UserDTO;

    const loginResponse = await request(app)
      .post("/session")
      .send({ username: userData.username, password: userData.password })
      .expect(200);

    const cookieHeader = loginResponse.headers["set-cookie"];
    const cookies = cookieHeader.toString().split(";");
    const tokenHeader = cookies.find((cookie) => cookie.startsWith("token=")) as string;
    jwtToken = tokenHeader.replace("token=", "");

    newGameData = {
      ...newGameData,
      user_creator_id: user.id,
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

  describe("POST /games/:gameId/players", () => {
    test("201 Created when player is added to game", async () => {
      const game = await createGame(newGameData);

      await request(app).post(`/games/${game.id}/players`).set("Cookie", `token=${jwtToken}`).expect(201);

      const playersIds = await findPlayersByGameId(game.id);
      expect(playersIds.length).toBe(1);
      expect(playersIds[0]).toBe(user.id);
    });

    test("400 Bad Request if game does not exist", async () => {
      const response = await request(app)
        .post("/games/999/players")
        .set("Cookie", `token=${jwtToken}`)
        .send({ userId: user.id })
        .expect(400);

      expect(response.body.message).toEqual("Game not found");
    });

    test("400 Bad Request if player is added twice", async () => {
      const game = await createGame(newGameData);
      await addPlayerToGame(game.id, user.id);

      const response = await request(app)
        .post(`/games/${game.id}/players`)
        .set("Cookie", `token=${jwtToken}`)
        .send({ userId: user.id })
        .expect(400);

      expect(response.body.message).toEqual("Player already in game");
    });

    test("400 Bad Request if game is full", async () => {
      const { user: userInGame1 } = await createTestUserWithLogin();
      const { user: userInGame2 } = await createTestUserWithLogin();
      const { user: userNotInGame } = await createTestUserWithLogin();

      const game = await createGame(newGameData);
      await addPlayerToGame(game.id, userInGame1.id);
      await addPlayerToGame(game.id, userInGame2.id);

      const response = await request(app)
        .post(`/games/${game.id}/players`)
        .set("Cookie", `token=${jwtToken}`)
        .send({ userId: userNotInGame.id })
        .expect(400);

      expect(response.body.message).toEqual("Game full");
    });

    test("limits players to max allowed during concurrent additions", async () => {
      const { token: user1Token } = await createTestUserWithLogin();
      const { token: user2Token } = await createTestUserWithLogin();

      const game = await createGame(newGameData);
      await request(app).post(`/games/${game.id}/players`).set("Cookie", `token=${user1Token}`).send();
      await request(app).post(`/games/${game.id}/players`).set("Cookie", `token=${user2Token}`).send();

      const players = await findPlayersByGameId(game.id);
      expect(players.length).toBe(2);
    });

    test("prevents adding players beyond allowed limit across iterations", async () => {
      async function postPlayerToGame(gameId: number, userToken: string) {
        return request(app).post(`/games/${gameId}/players`).set("Cookie", `token=${userToken}`).send();
      }

      const { token: user1Token } = await createTestUserWithLogin();
      const { token: user2Token } = await createTestUserWithLogin();
      const { token: user3Token } = await createTestUserWithLogin();

      for (let i = 0; i < 20; i++) {
        const game = await createGame(newGameData);
        logger.info(`Iteration ${i} - Game ${game.id}`);
        const responses = await Promise.all([
          postPlayerToGame(game.id, user1Token),
          postPlayerToGame(game.id, user2Token),
          postPlayerToGame(game.id, user3Token),
        ]);

        const players = await findPlayersByGameId(game.id);
        expect(players.length).toBeGreaterThanOrEqual(1);
        expect(players.length).toBeLessThanOrEqual(game.player_count);

        const actualStatusCodes = responses.map((res) => res.statusCode);

        const successCount = actualStatusCodes.filter((code) => code === 201).length;
        const failCount = actualStatusCodes.filter((code) => code === 400).length;

        // The success count should be between 1 and game.player_count
        expect(successCount).toBeGreaterThanOrEqual(1);
        expect(successCount).toBeLessThanOrEqual(game.player_count);
        // The failure count should be between 0 and the number of excess requests
        expect(failCount).toBeGreaterThanOrEqual(0);
        expect(failCount).toBeLessThanOrEqual(3 - successCount);

        expect(successCount + failCount).toBe(3);
      }
    });
  });
});
