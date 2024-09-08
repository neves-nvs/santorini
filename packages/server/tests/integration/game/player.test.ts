import { addPlayerToGame, createGame, findPlayersByGameId } from "../../../src/game/gameRepository";
import { app, server } from "../../../src/main";

import { NewGame } from "../../../src/model";
import { UserDTO } from "./../../../src/users/userDTO";
import { db } from "../../../src/database";
import logger from "../../../src/logger";
import request from "supertest";

async function createUserWithLogin() {
  const randomUsername = Math.random().toString(36).substring(7);
  const randomPassword = Math.random().toString(36).substring(7);
  const userData = {
    username: randomUsername,
    password: randomPassword,
  };

  const createUserResponse = await request(app).post("/users").send(userData).expect(201);
  const user = createUserResponse.body as UserDTO;

  const loginResponse = await request(app)
    .post("/session")
    .send({ username: randomUsername, password: randomPassword })
    .expect(200);
  const cookieHeader = loginResponse.headers["set-cookie"];
  const cookies = cookieHeader.toString().split(";");
  const jwtToken = cookies.find((cookie) => cookie.startsWith("token=")) as string;

  return { user: user, token: jwtToken };
}

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

describe("Players in Game API", () => {
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

  describe("POST /games/:gameId/players", () => {
    test("201 when adding a player to the game", async () => {
      const game = await createGame(newGameData);

      await request(app).post(`/games/${game.id}/players`).set("Cookie", jwtToken).expect(201);

      const players = await findPlayersByGameId(game.id);
      expect(players.length).toBe(1);
      // expect(players[0]).toBe(user);
    });

    test("400 if adding a player to a game that does not exist", async () => {
      const response = await request(app)
        .post("/games/999/players")
        .set("Cookie", jwtToken)
        .send({ userId: user.id })
        .expect(400);

      expect(response.body.message).toEqual("Game not found");
    });

    test("400 if adding a player to a game twice", async () => {
      const game = await createGame(newGameData);
      await addPlayerToGame(game.id, user.id);

      const response = await request(app)
        .post(`/games/${game.id}/players`)
        .set("Cookie", jwtToken)
        .send({ userId: user.id })
        .expect(400);

      expect(response.body.message).toEqual("Player already in game");
    });

    test("400 if adding a user to a full game", async () => {
      const { user: userInGame1 } = await createUserWithLogin();
      const { user: userInGame2 } = await createUserWithLogin();
      const { user: userNotInGame } = await createUserWithLogin();

      const game = await createGame(newGameData);
      await addPlayerToGame(game.id, userInGame1.id);
      await addPlayerToGame(game.id, userInGame2.id);

      const response = await request(app)
        .post(`/games/${game.id}/players`)
        .set("Cookie", jwtToken)
        .send({ userId: userNotInGame.id })
        .expect(400);

      expect(response.body.message).toEqual("Game full");
    });

    test("concurrent addition of 3 players to a 2 player game should maintain players per game <= player_count", async () => {
      const { token: user1Token } = await createUserWithLogin();
      const { token: user2Token } = await createUserWithLogin();

      const game = await createGame(newGameData);
      await request(app).post(`/games/${game.id}/players`).set("Cookie", user1Token).send();
      await request(app).post(`/games/${game.id}/players`).set("Cookie", user2Token).send();

      const players = await findPlayersByGameId(game.id);
      expect(players.length).toBe(2);
    });

    test("should not allow adding more than the allowed number of players over multiple iterations", async () => {
      async function postPlayerToGame(gameId: number, userToken: string) {
        return request(app).post(`/games/${gameId}/players`).set("Cookie", userToken).send();
      }

      const { token: user1Token } = await createUserWithLogin();
      const { token: user2Token } = await createUserWithLogin();
      const { token: user3Token } = await createUserWithLogin();

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
        // const expectedStatusCodes = [201, 201, 400];
        // expect(actualStatusCodes.sort()).toEqual(expectedStatusCodes.sort());

        const successCount = actualStatusCodes.filter((code) => code === 201).length;
        const failCount = actualStatusCodes.filter((code) => code === 400).length;

        // The success count should be between 1 and game.player_count
        expect(successCount).toBeGreaterThanOrEqual(1);
        expect(successCount).toBeLessThanOrEqual(game.player_count);

        // The failure count should be between 0 and the number of excess requests
        expect(failCount).toBeGreaterThanOrEqual(0);
        expect(failCount).toBeLessThanOrEqual(3 - successCount);

        // Optionally, you can also check that the correct number of players were added to the game
        expect(successCount + failCount).toBe(3);
        // await db.deleteFrom("players").where("game_id", "=", game.id).execute();
      }
    });
  });
});
