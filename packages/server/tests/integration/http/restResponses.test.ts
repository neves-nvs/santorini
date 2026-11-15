import {
  CreateGameResponse,
  CurrentUserResponse,
  GameErrorResponse,
  GameSummary,
  JoinGameResponse,
  LogoutResponse,
  MessageResponse,
  PlayerGameView,
  PlayerView,
  TestAuthResponse,
  TokenResponse,
  UserView,
  ValidationErrorResponse,
  ValidationFieldError,
  WebSocketTicketResponse,
} from "@santorini/shared";
import { createTestGame, createTestUserWithLogin, generateTestUser } from "../helper/helpers.ts";
import { app } from "../../../src/app.ts";
import { cleanupTestData } from "../helper/testDb.ts";
import { db } from "../../../src/database.ts";
import request from "supertest";

// Each expected body is checked twice: `satisfies` makes the compiler require exactly the keys of the shared
// type, and toStrictEqual makes the real response carry exactly those keys with values of those kinds.
const isoDate = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

const userView = {
  id: expect.any(Number),
  username: expect.any(String),
  displayName: expect.any(String),
  createdAt: isoDate,
} satisfies Record<keyof UserView, unknown>;

const playerView = {
  id: expect.any(Number),
  userId: expect.any(Number),
  seat: expect.any(Number),
  status: "active",
  isReady: false,
} satisfies Record<keyof PlayerView, unknown>;

const gameSummary = {
  id: expect.any(Number),
  creatorId: expect.any(Number),
  maxPlayers: 2,
  status: "waiting",
  phase: null,
  currentPlayerId: null,
  turnNumber: expect.any(Number),
  version: expect.any(Number),
  playerCount: 1,
  players: [playerView],
  createdAt: isoDate,
  startedAt: null,
  finishedAt: null,
} satisfies Record<keyof GameSummary, unknown>;

const fieldError = {
  type: "field",
  msg: expect.any(String),
  path: "password",
  location: "body",
} satisfies Record<keyof ValidationFieldError, unknown>;

const emptyCell = { height: 0, hasDome: false, worker: null };

const waitingGameView = {
  gameId: expect.any(Number),
  status: "waiting",
  phase: null,
  currentPlayerId: null,
  turnNumber: expect.any(Number),
  version: expect.any(Number),
  board: { cells: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => emptyCell)) },
  players: [playerView],
  isCurrentPlayer: false,
} satisfies Omit<Record<keyof PlayerGameView, unknown>, "availableMoves" | "winnerId" | "winReason">;

describe("REST responses carry the shape of the shared types", () => {
  afterEach(cleanupTestData);

  afterAll(async () => {
    await db.destroy();
  });

  describe("session", () => {
    test("POST /session answers the text OK and sets the cookie", async () => {
      const { userData } = await generateTestUser();

      const response = await request(app).post("/session").send(userData).expect(200);

      expect(response.text).toBe("OK");
      expect(response.headers["set-cookie"]).toBeDefined();
    });

    test("POST /logout", async () => {
      const response = await request(app).post("/logout").expect(200);

      expect(response.body).toStrictEqual({ message: expect.any(String) } satisfies Record<
        keyof LogoutResponse,
        unknown
      >);
    });

    test("GET /me", async () => {
      const { token } = await createTestUserWithLogin();

      const response = await request(app).get("/me").set("Cookie", `token=${token}`).expect(200);

      expect(response.body).toStrictEqual({
        id: expect.any(Number),
        username: expect.any(String),
      } satisfies Record<keyof CurrentUserResponse, unknown>);
    });

    test("POST /ws-ticket", async () => {
      const { token } = await createTestUserWithLogin();

      const response = await request(app).post("/ws-ticket").set("Cookie", `token=${token}`).expect(200);

      expect(response.body).toStrictEqual({ ticket: expect.any(String) } satisfies Record<
        keyof WebSocketTicketResponse,
        unknown
      >);
    });

    test("GET /token", async () => {
      const { token } = await createTestUserWithLogin();

      const response = await request(app).get("/token").set("Cookie", `token=${token}`).expect(200);

      expect(response.body).toStrictEqual({ token: expect.any(String) } satisfies Record<keyof TokenResponse, unknown>);
    });

    test("GET /test-auth", async () => {
      const { token } = await createTestUserWithLogin();

      const response = await request(app).get("/test-auth").set("Cookie", `token=${token}`).expect(200);

      expect(response.body).toStrictEqual({
        id: expect.any(Number),
        username: expect.any(String),
        display_name: expect.any(String),
        created_at: isoDate,
      } satisfies Record<keyof TestAuthResponse, unknown>);
    });
  });

  describe("users", () => {
    test("POST /users, GET /users and GET /users/:username return a UserView", async () => {
      const { user } = await generateTestUser();
      const { token } = await createTestUserWithLogin();

      expect(user).toStrictEqual(userView);

      const list = await request(app).get("/users").set("Cookie", `token=${token}`).expect(200);
      expect(list.body).toHaveLength(2);
      for (const entry of list.body) expect(entry).toStrictEqual(userView);

      const single = await request(app).get(`/users/${user.username}`).expect(200);
      expect(single.body).toStrictEqual(userView);
    });
  });

  describe("games", () => {
    test("POST /games returns the new game id", async () => {
      const { token } = await createTestUserWithLogin();

      const response = await request(app)
        .post("/games")
        .set("Cookie", `token=${token}`)
        .send({ maxPlayers: 2 })
        .expect(200);

      expect(response.body).toStrictEqual({ gameId: expect.any(Number) } satisfies Record<
        keyof CreateGameResponse,
        unknown
      >);
    });

    test("GET /games and GET /games/my return GameSummary entries", async () => {
      const { token } = await createTestUserWithLogin();
      await createTestGame(token);

      const open = await request(app).get("/games").set("Cookie", `token=${token}`).expect(200);
      const mine = await request(app).get("/games/my").set("Cookie", `token=${token}`).expect(200);

      expect(open.body).toStrictEqual([gameSummary]);
      expect(mine.body).toStrictEqual([gameSummary]);
    });

    test("GET /games/:gameId returns the PlayerGameView", async () => {
      const { token } = await createTestUserWithLogin();
      const gameId = await createTestGame(token);

      const response = await request(app).get(`/games/${gameId}`).set("Cookie", `token=${token}`).expect(200);

      expect(response.body).toStrictEqual({ ...waitingGameView, gameId });
    });

    test("POST /games/:gameId/join", async () => {
      const { token: creator } = await createTestUserWithLogin();
      const { token: joiner } = await createTestUserWithLogin();
      const gameId = await createTestGame(creator);

      const response = await request(app).post(`/games/${gameId}/join`).set("Cookie", `token=${joiner}`).expect(200);

      expect(response.body).toStrictEqual({ success: true } satisfies Record<keyof JoinGameResponse, unknown>);
    });
  });

  describe("errors", () => {
    test("a failed validation is a ValidationErrorResponse", async () => {
      const response = await request(app).post("/session").send({ username: "someone" }).expect(400);

      expect(response.body).toStrictEqual({ errors: expect.any(Array) } satisfies Record<
        keyof ValidationErrorResponse,
        unknown
      >);
      expect(response.body.errors.length).toBeGreaterThan(0);
      for (const error of response.body.errors) expect(error).toStrictEqual(fieldError);
    });

    test("a missing session is a MessageResponse", async () => {
      const response = await request(app).get("/me").expect(401);

      expect(response.body).toStrictEqual({ message: "Unauthorized" } satisfies MessageResponse);
    });

    test("an unknown game is a GameErrorResponse", async () => {
      const { token } = await createTestUserWithLogin();

      const response = await request(app).get("/games/999999").set("Cookie", `token=${token}`).expect(404);

      expect(response.body).toStrictEqual({ error: "Game not found" } satisfies GameErrorResponse);
    });
  });
});
