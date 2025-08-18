import { createEmptyBoard, saveBoardState, loadBoardState } from "../../../src/game/boardState";
import { getCurrentTurnState } from "../../../src/game/turnManager";
import * as gameRepository from "../../../src/game/gameRepository";
import { db } from "../../../src/database";
import { NewGame, NewUser } from "../../../src/model";

describe("Database Persistence Integration", () => {
  let testGameId: number;
  let testUserId1: number;
  let testUserId2: number;

  beforeAll(async () => {
    // Create test users
    const user1: NewUser = {
      username: "testuser1_persistence",
      display_name: "Test User 1",
      google_id: null,
      password_hash: "hash1",
      password_salt: "salt1",
      created_at: new Date().toISOString()
    };

    const user2: NewUser = {
      username: "testuser2_persistence",
      display_name: "Test User 2",
      google_id: null,
      password_hash: "hash2",
      password_salt: "salt2",
      created_at: new Date().toISOString()
    };

    const createdUser1 = await db.insertInto("users").values(user1).returningAll().executeTakeFirstOrThrow();
    const createdUser2 = await db.insertInto("users").values(user2).returningAll().executeTakeFirstOrThrow();
    
    testUserId1 = createdUser1.id;
    testUserId2 = createdUser2.id;
  });

  beforeEach(async () => {
    // Create a fresh test game for each test
    const newGame: NewGame = {
      user_creator_id: testUserId1,
      player_count: 2,
      game_status: "in-progress",
      game_phase: "placing",
      current_player_id: testUserId1,
      turn_number: 1,
      placing_turns_completed: 0,
      created_at: new Date().toISOString()
    };

    const game = await gameRepository.createGame(newGame);
    testGameId = game.id;

    // Add both players to the game
    await gameRepository.addPlayerToGame(testGameId, testUserId1);
    await gameRepository.addPlayerToGame(testGameId, testUserId2);
  });

  afterEach(async () => {
    // Clean up test data in correct order (foreign key constraints)
    await db.deleteFrom("pieces").where("game_id", "=", testGameId).execute();
    await db.deleteFrom("players").where("game_id", "=", testGameId).execute();
    await db.deleteFrom("games").where("id", "=", testGameId).execute();
  });

  afterAll(async () => {
    // Clean up test users (games should be deleted by now)
    await db.deleteFrom("users").where("id", "in", [testUserId1, testUserId2]).execute();
    await db.destroy();
  });

  describe("Game State Persistence", () => {
    it("should preserve empty game state across database operations", async () => {
      // BEHAVIOR: "New games remain empty after being saved and loaded"

      // Arrange: Create a fresh game board
      const boardState = createEmptyBoard();

      // Act: Save and reload the game state
      await saveBoardState(testGameId, boardState);
      const loadedBoardState = await loadBoardState(testGameId);

      // Assert: Game remains in initial state
      expect(loadedBoardState.workers.size).toBe(0); // No workers placed

      // Verify board is still playable (all positions available)
      let emptyCount = 0;
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          if (!loadedBoardState.cells[x][y].worker) emptyCount++;
        }
      }
      expect(emptyCount).toBe(25); // All positions still empty
    });

    it("should save and load board state with workers", async () => {
      // Arrange
      const boardState = createEmptyBoard();
      
      // Place workers for both players
      boardState.cells[1][1].worker = { playerId: testUserId1, workerId: 1 };
      boardState.workers.set(`${testUserId1}-1`, { x: 1, y: 1, playerId: testUserId1 });
      
      boardState.cells[3][3].worker = { playerId: testUserId2, workerId: 1 };
      boardState.workers.set(`${testUserId2}-1`, { x: 3, y: 3, playerId: testUserId2 });

      // Act
      await saveBoardState(testGameId, boardState);
      const loadedBoardState = await loadBoardState(testGameId);

      // Assert
      expect(loadedBoardState.cells[1][1].worker).toEqual({ playerId: testUserId1, workerId: 1 });
      expect(loadedBoardState.cells[3][3].worker).toEqual({ playerId: testUserId2, workerId: 1 });
      expect(loadedBoardState.workers.size).toBe(2);
      expect(loadedBoardState.workers.get(`${testUserId1}-1`)).toEqual({ x: 1, y: 1, playerId: testUserId1 });
      expect(loadedBoardState.workers.get(`${testUserId2}-1`)).toEqual({ x: 3, y: 3, playerId: testUserId2 });
    });

    it("should preserve turn progression across database operations", async () => {
      // BEHAVIOR: "Game turn state persists correctly"

      // Arrange: Simulate game progression by updating turn state
      await gameRepository.updateGame(testGameId, {
        placing_turns_completed: 1,
        current_player_id: testUserId2
      });

      // Act: Reload turn state from database
      const turnState = await getCurrentTurnState(testGameId);

      // Assert: Turn progression is preserved
      expect(turnState!.placingTurnsCompleted).toBe(1);
      expect(turnState!.currentPlayerId).toBe(testUserId2); // Next player's turn
      expect(turnState!.currentPhase).toBe('placing'); // Still in placing phase
    });

    it("should save and load board state with buildings and domes", async () => {
      // Arrange
      const boardState = createEmptyBoard();
      
      // Add buildings of different heights
      boardState.cells[0][0].height = 1;
      boardState.cells[1][1].height = 2;
      boardState.cells[2][2].height = 3;
      
      // Add dome
      boardState.cells[3][3].hasDome = true;
      boardState.cells[3][3].height = 2; // Dome on level 2

      // Act
      await saveBoardState(testGameId, boardState);
      const loadedBoardState = await loadBoardState(testGameId);

      // Assert
      expect(loadedBoardState.cells[0][0].height).toBe(1);
      expect(loadedBoardState.cells[1][1].height).toBe(2);
      expect(loadedBoardState.cells[2][2].height).toBe(3);
      expect(loadedBoardState.cells[3][3].hasDome).toBe(true);
      expect(loadedBoardState.cells[3][3].height).toBe(2);
    });

    it("should save and load complex board state", async () => {
      // Arrange
      const boardState = createEmptyBoard();
      
      // Place all 4 workers
      boardState.cells[0][0].worker = { playerId: testUserId1, workerId: 1 };
      boardState.workers.set(`${testUserId1}-1`, { x: 0, y: 0, playerId: testUserId1 });
      
      boardState.cells[0][4].worker = { playerId: testUserId1, workerId: 2 };
      boardState.workers.set(`${testUserId1}-2`, { x: 0, y: 4, playerId: testUserId1 });
      
      boardState.cells[4][0].worker = { playerId: testUserId2, workerId: 1 };
      boardState.workers.set(`${testUserId2}-1`, { x: 4, y: 0, playerId: testUserId2 });
      
      boardState.cells[4][4].worker = { playerId: testUserId2, workerId: 2 };
      boardState.workers.set(`${testUserId2}-2`, { x: 4, y: 4, playerId: testUserId2 });
      
      // Add various buildings and domes
      boardState.cells[2][2].height = 3;
      boardState.cells[1][1].height = 1;
      boardState.cells[3][3].height = 2;
      boardState.cells[3][3].hasDome = true;

      // Act
      await saveBoardState(testGameId, boardState);
      const loadedBoardState = await loadBoardState(testGameId);

      // Assert - Workers
      expect(loadedBoardState.cells[0][0].worker).toEqual({ playerId: testUserId1, workerId: 1 });
      expect(loadedBoardState.cells[0][4].worker).toEqual({ playerId: testUserId1, workerId: 2 });
      expect(loadedBoardState.cells[4][0].worker).toEqual({ playerId: testUserId2, workerId: 1 });
      expect(loadedBoardState.cells[4][4].worker).toEqual({ playerId: testUserId2, workerId: 2 });
      
      // Assert - Buildings
      expect(loadedBoardState.cells[2][2].height).toBe(3);
      expect(loadedBoardState.cells[1][1].height).toBe(1);
      expect(loadedBoardState.cells[3][3].height).toBe(2);
      expect(loadedBoardState.cells[3][3].hasDome).toBe(true);
      
      // Assert - Worker tracking
      expect(loadedBoardState.workers.size).toBe(4);
      expect(loadedBoardState.workers.get(`${testUserId1}-1`)).toEqual({ x: 0, y: 0, playerId: testUserId1 });
      expect(loadedBoardState.workers.get(`${testUserId2}-2`)).toEqual({ x: 4, y: 4, playerId: testUserId2 });
    });

    it("should handle multiple save/load cycles", async () => {
      // Arrange
      const boardState = createEmptyBoard();
      
      // Initial state
      boardState.cells[1][1].worker = { playerId: testUserId1, workerId: 1 };
      boardState.workers.set(`${testUserId1}-1`, { x: 1, y: 1, playerId: testUserId1 });

      // Act & Assert - First cycle
      await saveBoardState(testGameId, boardState);
      let loadedBoardState = await loadBoardState(testGameId);
      expect(loadedBoardState.cells[1][1].worker).toEqual({ playerId: testUserId1, workerId: 1 });

      // Modify state
      loadedBoardState.cells[1][1].worker = undefined;
      loadedBoardState.workers.delete(`${testUserId1}-1`);
      loadedBoardState.cells[2][2].worker = { playerId: testUserId1, workerId: 1 };
      loadedBoardState.workers.set(`${testUserId1}-1`, { x: 2, y: 2, playerId: testUserId1 });
      loadedBoardState.cells[1][1].height = 1;

      // Act & Assert - Second cycle
      await saveBoardState(testGameId, loadedBoardState);
      const finalBoardState = await loadBoardState(testGameId);
      
      expect(finalBoardState.cells[1][1].worker).toBeUndefined();
      expect(finalBoardState.cells[1][1].height).toBe(1);
      expect(finalBoardState.cells[2][2].worker).toEqual({ playerId: testUserId1, workerId: 1 });
      expect(finalBoardState.workers.get(`${testUserId1}-1`)).toEqual({ x: 2, y: 2, playerId: testUserId1 });
    });
  });

  describe("Turn State Persistence", () => {
    it("should persist and load turn state", async () => {
      // Act
      const turnState = await getCurrentTurnState(testGameId);

      // Assert
      expect(turnState).not.toBeNull();
      expect(turnState!.gameId).toBe(testGameId);
      expect(turnState!.currentPlayerId).toBe(testUserId1);
      expect(turnState!.currentPhase).toBe('placing');
      expect(turnState!.turnNumber).toBe(1);
      expect(turnState!.placingTurnsCompleted).toBe(0);
      expect(turnState!.isGameOver).toBe(false);
    });

    it("should update turn state after game state changes", async () => {
      // Arrange - Update game state
      await gameRepository.updateGame(testGameId, {
        current_player_id: testUserId2,
        game_phase: 'moving',
        turn_number: 5,
        placing_turns_completed: 4
      });

      // Act
      const turnState = await getCurrentTurnState(testGameId);

      // Assert
      expect(turnState!.currentPlayerId).toBe(testUserId2);
      expect(turnState!.currentPhase).toBe('moving');
      expect(turnState!.turnNumber).toBe(5);
      expect(turnState!.placingTurnsCompleted).toBe(4);
    });

    it("should persist completed game state", async () => {
      // Arrange - Mark game as completed
      await gameRepository.updateGame(testGameId, {
        game_status: 'completed',
        winner_id: testUserId1,
        win_reason: 'win_condition'
      });

      // Act
      const turnState = await getCurrentTurnState(testGameId);

      // Assert
      expect(turnState!.isGameOver).toBe(true);
      expect(turnState!.winner).toBe(testUserId1);
      expect(turnState!.winReason).toBe('win_condition');
    });
  });

  describe("Full Game Persistence Integration", () => {
    it("should persist complete game state through multiple operations", async () => {
      // This test demonstrates that a complete game state can be saved and restored
      
      // Arrange - Set up a game in progress
      const boardState = createEmptyBoard();
      
      // Place workers (simulating completed placing phase)
      boardState.cells[1][1].worker = { playerId: testUserId1, workerId: 1 };
      boardState.workers.set(`${testUserId1}-1`, { x: 1, y: 1, playerId: testUserId1 });
      
      boardState.cells[3][3].worker = { playerId: testUserId2, workerId: 1 };
      boardState.workers.set(`${testUserId2}-1`, { x: 3, y: 3, playerId: testUserId2 });
      
      // Add some buildings (simulating game progress)
      boardState.cells[2][2].height = 2;
      
      // Update turn state (simulating game in moving phase)
      await gameRepository.updateGame(testGameId, {
        game_phase: 'moving',
        current_player_id: testUserId2,
        turn_number: 3,
        placing_turns_completed: 4
      });

      // Act - Save board state
      await saveBoardState(testGameId, boardState);

      // Simulate server restart by loading everything fresh
      const loadedTurnState = await getCurrentTurnState(testGameId);
      const loadedBoardState = await loadBoardState(testGameId);

      // Assert - Complete game state is preserved
      expect(loadedTurnState!.currentPhase).toBe('moving');
      expect(loadedTurnState!.currentPlayerId).toBe(testUserId2);
      expect(loadedTurnState!.turnNumber).toBe(3);
      expect(loadedTurnState!.placingTurnsCompleted).toBe(4);
      
      expect(loadedBoardState.cells[1][1].worker).toEqual({ playerId: testUserId1, workerId: 1 });
      expect(loadedBoardState.cells[3][3].worker).toEqual({ playerId: testUserId2, workerId: 1 });
      expect(loadedBoardState.cells[2][2].height).toBe(2);
      expect(loadedBoardState.workers.size).toBe(2);
    });
  });
});
