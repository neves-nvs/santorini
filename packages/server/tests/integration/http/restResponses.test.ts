import {
  CreateGameResponse,
  CurrentUserResponse,
  ErrorResponse,
  GameSummary,
  GameView,
  LogoutResponse,
  GameSummaryPlayerView,
  UserView,
  WebSocketTicketResponse,
} from "@santorini/shared";
import request from "supertest";

import { db } from "@/database.ts";
import { createTestGame, createTestUserWithLogin, generateTestUser } from "@tests/integration/helper/helpers.ts";
import { specApp as app } from "@tests/integration/helper/specApp.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";

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
  userId: expect.any(Number),
  isReady: false,
} satisfies Record<keyof GameSummaryPlayerView, unknown>;

const gamePlayerView = {
  ...playerView,
  username: expect.any(String),
  isConnected: false,
};

const gameSummary = {
  id: expect.any(Number),
  creatorId: expect.any(Number),
  maxPlayers: 2,
  status: "waiting",
  phase: null,
  currentSeat: null,
  turnNumber: expect.any(Number),
  version: expect.any(Number),
  playerCount: 1,
  players: [playerView],
  createdAt: isoDate,
  startedAt: null,
  finishedAt: null,
} satisfies Record<keyof GameSummary, unknown>;

const emptyCell = { height: 0, hasDome: false, worker: null };

const waitingGameView = {
  gameId: expect.any(Number),
  status: "waiting",
  phase: null,
  currentSeat: null,
  turnNumber: expect.any(Number),
  version: expect.any(Number),
  board: { cells: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => emptyCell)) },
  players: [gamePlayerView],
  maxPlayers: 2,
  winnerUserId: null,
  winReason: null,
  viewer: { role: "player", isCurrentPlayer: false, availableMoves: [] },
} satisfies Record<keyof GameView, unknown>;

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
  });

  describe("users", () => {
    test("POST /users and GET /users/:username return a UserView", async () => {
      const { user, token } = await createTestUserWithLogin();

      expect(user).toStrictEqual(userView);

      const single = await request(app).get(`/users/${user.username}`).set("Cookie", `token=${token}`).expect(200);
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

    test("GET /games/:gameId returns the GameView", async () => {
      const { token } = await createTestUserWithLogin();
      const gameId = await createTestGame(token);

      const response = await request(app).get(`/games/${gameId}`).set("Cookie", `token=${token}`).expect(200);

      expect(response.body).toStrictEqual({ ...waitingGameView, gameId });
    });
  });

  describe("errors", () => {
    test("a failed validation is an ErrorResponse with the issues", async () => {
      const response = await request(app).post("/session").send({ username: "someone" }).expect(400);

      expect(response.body).toStrictEqual({
        error: { code: "validation_failed", message: expect.any(String), details: { issues: expect.any(Array) } },
      } satisfies ErrorResponse);
      expect(response.body.error.details.issues.length).toBeGreaterThan(0);
      for (const issue of response.body.error.details.issues) {
        expect(issue).toStrictEqual({ path: ["password"], message: expect.any(String) });
      }
    });

    test("a missing session is an ErrorResponse", async () => {
      const response = await request(app).get("/me").expect(401);

      expect(response.body).toStrictEqual({
        error: { code: "unauthorized", message: "Unauthorized" },
      } satisfies ErrorResponse);
    });

    test("an unknown game is an ErrorResponse", async () => {
      const { token } = await createTestUserWithLogin();

      const response = await request(app).get("/games/999999").set("Cookie", `token=${token}`).expect(404);

      expect(response.body).toStrictEqual({
        error: { code: "game_not_found", message: "Game not found" },
      } satisfies ErrorResponse);
    });
  });
});
