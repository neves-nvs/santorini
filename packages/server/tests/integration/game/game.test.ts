import { addPlayerToGame, createGame, findGameById, findUsersByGame } from "../../../src/game/gameRepository";
import { app, server } from "../../../src/main";

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

let jwtToken: string;
let user: UserDTO;

describe("Games API Integration Tests with Authentication", () => {
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

  describe("POST /games/:gameId/players", () => {
    test("should add a player to the game", async () => {
      const game = await createGame(newGameData);

      await request(app).post(`/games/${game.id}/players`).set("Cookie", jwtToken).expect(201);

      const players = await findUsersByGame(game.id);
      expect(players.length).toBe(1);
      // expect(players[0]).toBe(user);
    });

    test("should return 400 if the game does not exist", async () => {
      const response = await request(app)
        .post("/games/999/players")
        .set("Cookie", jwtToken)
        .send({ userId: user.id })
        .expect(400);

      expect(response.body.message).toEqual("Game not found");
    });

    test("should return 400 if the user is already in the game", async () => {
      const game = await createGame(newGameData);
      await addPlayerToGame(game.id, user.id);

      const response = await request(app)
        .post(`/games/${game.id}/players`)
        .set("Cookie", jwtToken)
        .send({ userId: user.id })
        .expect(400);

      expect(response.body.message).toEqual("Player already in game");
    });

    test("should return 400 if the game is full", async () => {
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
  });

  describe("GET /games/:gameId/plays", () => {
    test.skip("should return 200 if the game exists", async () => {
      // create users
      //create game
      // add users to game
      // get plays for players
      await request(app).get("/games/1/plays").set("Cookie", jwtToken).expect(200);
    });
  });

  describe("POST /games/:gameId/plays", () => {
    test.skip("should return 200 if play is successfully applied", async () => {
      const game = await createGame(newGameData);
      await addPlayerToGame(game.id, user.id);

      // const playsResponse = await request(app).get(`/games/${game.id}/plays`).set("Cookie", jwtToken).expect(200);
      // const plays = playsResponse.body as Play[];

      // const play = plays[0];

      // const applyPlayResponse = await request(app)
      //   .post(`/games/${game.id}/plays`)
      //   .set("Cookie", jwtToken)
      //   .send({ play })
      //   .expect(200);

      // expect(applyPlayResponse.body).toEqual("Play successfully applied");
    });

    test.skip("should return 400 if play is missing", async () => {
      const response = await request(app).post("/games/1/plays").set("Cookie", jwtToken).send({}).expect(400);

      expect(response.body).toEqual("Play required");
    });

    test.skip("should return 400 if play is invalid", async () => {
      const response = await request(app)
        .post("/games/1/plays")
        .set("Cookie", jwtToken)
        .send({ play: "invalid" })
        .expect(400);

      expect(response.body).toEqual("Invalid play");
    });
  });
});
