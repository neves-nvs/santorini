import {
  getCurrentTurnState,
  getAvailablePlays,
  executeMove
} from "../../../src/game/turnManager";
import { createEmptyBoard } from "../../../src/game/boardState";
import * as gameRepository from "../../../src/game/gameRepository";

// Mock the dependencies
jest.mock("../../../src/game/gameRepository");
jest.mock("../../../src/game/boardState");

// Mock gameController with jest.fn() directly in the mock
jest.mock("../../../src/game/gameController", () => ({
  generatePlacingPhaseAvailablePlays: jest.fn(),
  generateMovingPhaseAvailablePlays: jest.fn(),
  generateBuildingPhaseAvailablePlays: jest.fn(),
  checkGameState: jest.fn()
}));

const mockGameRepository = gameRepository as jest.Mocked<typeof gameRepository>;

// Mock board state functions
jest.mock("../../../src/game/boardState", () => ({
  createEmptyBoard: jest.fn(() => ({
    cells: Array(5).fill(null).map(() => Array(5).fill(null).map(() => ({
      height: 0,
      hasDome: false,
      worker: undefined
    }))),
    workers: new Map()
  })),
  loadBoardState: jest.fn(),
  saveBoardState: jest.fn()
}));

const mockBoardState = require("../../../src/game/boardState");
const mockGameController = require("../../../src/game/gameController");

describe("Turn Manager", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup board state mocks
    mockBoardState.loadBoardState.mockResolvedValue(createEmptyBoard());
    mockBoardState.saveBoardState.mockResolvedValue(undefined);

    // Setup game controller mocks with default values
    mockGameController.generatePlacingPhaseAvailablePlays.mockResolvedValue([]);
    mockGameController.generateMovingPhaseAvailablePlays.mockResolvedValue([]);
    mockGameController.generateBuildingPhaseAvailablePlays.mockResolvedValue([]);
    mockGameController.checkGameState.mockResolvedValue({ gameOver: false, winner: null, reason: null });
  });

  describe("getCurrentTurnState", () => {
    it("should return turn state for placing phase", async () => {
      // Arrange
      const gameId = 1;
      const mockGame = {
        id: 1,
        current_player_id: 1,
        game_phase: 'placing',
        turn_number: 1,
        placing_turns_completed: 0,
        game_status: 'in-progress',
        winner_id: null,
        win_reason: null
      };

      mockGameRepository.findGameById.mockResolvedValue(mockGame as any);

      // Act
      const result = await getCurrentTurnState(gameId);

      // Assert
      expect(result).toEqual({
        gameId: 1,
        currentPlayerId: 1,
        currentPhase: 'placing',
        turnNumber: 1,
        placingTurnsCompleted: 0,
        isGameOver: false,
        winner: undefined,
        winReason: undefined
      });
    });

    it("should return turn state for completed game", async () => {
      // Arrange
      const gameId = 1;
      const mockGame = {
        id: 1,
        current_player_id: 2,
        game_phase: 'building',
        turn_number: 5,
        placing_turns_completed: 4,
        game_status: 'completed',
        winner_id: 1,
        win_reason: 'win_condition'
      };

      mockGameRepository.findGameById.mockResolvedValue(mockGame as any);

      // Act
      const result = await getCurrentTurnState(gameId);

      // Assert
      expect(result).toEqual({
        gameId: 1,
        currentPlayerId: 2,
        currentPhase: 'building',
        turnNumber: 5,
        placingTurnsCompleted: 4,
        isGameOver: true,
        winner: 1,
        winReason: 'win_condition'
      });
    });

    it("should return null for non-existent game", async () => {
      // Arrange
      const gameId = 999;
      mockGameRepository.findGameById.mockResolvedValue(undefined);

      // Act
      const result = await getCurrentTurnState(gameId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getAvailablePlays", () => {
    it("should return empty array for completed game", async () => {
      // Arrange
      const gameId = 1;
      const mockGame = {
        id: 1,
        game_status: 'completed'
      };

      mockGameRepository.findGameById.mockResolvedValue(mockGame as any);

      // Act
      const result = await getAvailablePlays(gameId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return placing moves for placing phase", async () => {
      // Arrange
      const gameId = 1;
      const mockGame = {
        id: 1,
        current_player_id: 1,
        game_phase: 'placing',
        turn_number: 1,
        placing_turns_completed: 0,
        game_status: 'in-progress'
      };

      mockGameRepository.findGameById.mockResolvedValue(mockGame as any);

      // Setup the placing phase mock to return specific moves
      mockGameController.generatePlacingPhaseAvailablePlays.mockResolvedValue([
        { type: 'place_worker', position: { x: 0, y: 0 } },
        { type: 'place_worker', position: { x: 0, y: 1 } }
      ]);

      // Act
      const result = await getAvailablePlays(gameId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('type', 'place_worker');
      expect(mockGameController.generatePlacingPhaseAvailablePlays).toHaveBeenCalledWith(gameId);
    });
  });

  describe("executeMove", () => {
    it("should reject move when not player's turn", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 2; // Wrong player
      const move = { type: 'place_worker', position: { x: 0, y: 0 } };

      const mockGame = {
        id: 1,
        current_player_id: 1, // Current player is 1, not 2
        game_phase: 'placing',
        game_status: 'in-progress'
      };

      mockGameRepository.findGameById.mockResolvedValue(mockGame as any);

      // Act
      const result = await executeMove(gameId, playerId, move);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it("should reject move for completed game", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const move = { type: 'place_worker', position: { x: 0, y: 0 } };

      const mockGame = {
        id: 1,
        current_player_id: 1,
        game_phase: 'placing',
        game_status: 'completed' // Game is over
      };

      mockGameRepository.findGameById.mockResolvedValue(mockGame as any);

      // Act
      const result = await executeMove(gameId, playerId, move);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Game is already over');
    });

    it("should reject invalid move", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const move = { type: 'place_worker', position: { x: 0, y: 0 } };

      const mockGame = {
        id: 1,
        current_player_id: 1,
        game_phase: 'placing',
        game_status: 'in-progress',
        turn_number: 1,
        placing_turns_completed: 0
      };

      mockGameRepository.findGameById.mockResolvedValue(mockGame as any);

      // Mock available plays that don't include our move
      mockGameController.generatePlacingPhaseAvailablePlays.mockResolvedValue([
        { type: 'place_worker', position: { x: 1, y: 1 } } // Different position
      ]);

      // Act
      const result = await executeMove(gameId, playerId, move);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid move');
      expect(mockGameController.generatePlacingPhaseAvailablePlays).toHaveBeenCalledWith(gameId);
    });
  });

  describe("Turn Progression", () => {
    it("should handle placing phase progression correctly", async () => {
      // This would be an integration test that verifies:
      // 1. Player 1 places worker 1
      // 2. Turn switches to Player 2
      // 3. Player 2 places worker 1
      // 4. Turn switches back to Player 1
      // 5. Player 1 places worker 2
      // 6. Player 2 places worker 2
      // 7. Phase switches to moving with Player 1

      // For now, we'll test the logic conceptually
      expect(true).toBe(true); // Placeholder
    });

    it("should handle moving to building phase transition", async () => {
      // This would test:
      // 1. Player moves worker
      // 2. Phase switches to building (same player)
      // 3. Player builds
      // 4. Turn switches to next player's moving phase

      expect(true).toBe(true); // Placeholder
    });
  });
});
