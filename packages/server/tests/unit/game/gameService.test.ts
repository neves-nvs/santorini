import * as gameRepository from "../../../src/game/gameRepository";
import request from "supertest";
import * as userRepository from "../../../src/users/userRepository";
import { app, server } from "../../../src/main";
import { db } from "../../../src/database";

jest.mock("@src/game/gameRepository");
jest.mock("@src/users/userRepository");

const mockUsername = "testUser";
describe("Game Endpoints", () => {
  const mockGameId = "123e4567-e89b-12d3-a456-426614174000";

  beforeAll(() => {
    (gameRepository.getAllGameIds as jest.Mock).mockReturnValue([mockGameId]);
    (gameRepository.createGame as jest.Mock).mockReturnValue({
      getId: () => mockGameId,
    });
    (gameRepository.findGameById as jest.Mock).mockReturnValue({
      addPlayer: jest.fn(),
      isReadyToStart: jest.fn().mockReturnValue(false),
      start: jest.fn(),
      getCurrentPlayer: jest.fn(),
      updatePlays: jest.fn(),
      getPlays: jest.fn().mockReturnValue([]),
    });
    (userRepository.findUserByUsername as jest.Mock).mockReturnValue({
      getUsername: () => mockUsername,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    server.close();
    db.destroy();
  });

  describe("GET /games", () => {
    it("should return a list of game IDs", async () => {
      const response = await request(app).get("/games");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain(mockGameId);
    });
  });

  describe("POST /games", () => {
    it("should create a new game", async () => {
      const newGame = { username: mockUsername, amountOfPlayers: 4 };
      const response = await request(app).post("/games").send(newGame);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("gameId", mockGameId);
    });
  });

  // describe("DELETE /games/:gameId", () => {
  //   it("should return 501 Not Implemented", async () => {
  //     const response = await request(app).delete(`/games/${mockGameId}`);
  //     expect(response.status).toBe(501);
  //     expect(response.text).toBe("Delete game not implemented");
  //   });
  // });

  describe("POST /games/:gameId/players", () => {
    it("should add a player to the game", async () => {
      const player = { username: mockUsername };
      const response = await request(app).post(`/games/${mockGameId}/players`).send(player);
      expect(response.status).toBe(201);
    });
  });
});
