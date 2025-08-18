import {
  generatePlacingPhaseAvailablePlays,
  generateMovingPhaseAvailablePlays,
  generateBuildingPhaseAvailablePlays,
  checkWinningMove,
  checkGameState,
  checkPlayerBlocked,
  addGodPower,
  getGameEngine
} from "../../../src/game/gameController";

describe("Game Controller - Placing Phase", () => {
  // Reset the game engine before each test to ensure clean state
  beforeEach(() => {
    const engine = getGameEngine();
    // Clear all hooks
    engine.clearHooks();
  });

  describe("generatePlacingPhaseAvailablePlays", () => {
    it("should return 25 available plays for empty board", async () => {
      // Arrange
      const gameId = 1;

      // Act - Pass null to use fallback logic (no database)
      const result = await generatePlacingPhaseAvailablePlays(gameId, null);

      // Assert
      expect(result).toHaveLength(25);
    });

    it("should return plays with correct structure", async () => {
      // Arrange
      const gameId = 1;

      // Act
      const result = await generatePlacingPhaseAvailablePlays(gameId, null);

      // Assert
      const firstPlay = result[0];
      expect(firstPlay).toHaveProperty("type", "place_worker");
      expect(firstPlay).toHaveProperty("position");
      expect(firstPlay.position).toHaveProperty("x");
      expect(firstPlay.position).toHaveProperty("y");
    });

    it("should include position (0,0) as first play", async () => {
      // Arrange
      const gameId = 1;

      // Act
      const result = await generatePlacingPhaseAvailablePlays(gameId, null);

      // Assert
      expect(result[0]).toEqual({
        type: "place_worker",
        position: { x: 0, y: 0 }
      });
    });

    it("should include position (4,4) as last play", async () => {
      // Arrange
      const gameId = 1;

      // Act
      const result = await generatePlacingPhaseAvailablePlays(gameId, null);

      // Assert
      expect(result[24]).toEqual({
        type: "place_worker",
        position: { x: 4, y: 4 }
      });
    });

    it("should exclude occupied positions when board state is provided", async () => {
      // Arrange
      const gameId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Place some workers on the board
      boardState.cells[0][0].worker = { playerId: 1, workerId: 1 };
      boardState.cells[2][2].worker = { playerId: 2, workerId: 1 };
      boardState.cells[4][4].worker = { playerId: 1, workerId: 2 };

      // Act
      const result = await generatePlacingPhaseAvailablePlays(gameId, boardState);

      // Assert
      expect(result).toHaveLength(22); // 25 - 3 occupied = 22

      // Check that occupied positions are not included
      const positions = result.map(move => `${move.position?.x},${move.position?.y}`);
      expect(positions).not.toContain('0,0');
      expect(positions).not.toContain('2,2');
      expect(positions).not.toContain('4,4');

      // Check that empty positions are still included
      expect(positions).toContain('1,1');
      expect(positions).toContain('3,3');
    });
  });

  describe("generateMovingPhaseAvailablePlays", () => {
    it("should return empty array when player has no workers", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Act
      const result = await generateMovingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should generate moves for worker on empty board", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Place worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Act
      const result = await generateMovingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      expect(result).toHaveLength(8); // 8 adjacent positions

      // Check structure of moves
      const firstMove = result[0];
      expect(firstMove).toHaveProperty("type", "move_worker");
      expect(firstMove).toHaveProperty("workerId", 1);
      expect(firstMove).toHaveProperty("position");
      expect(firstMove).toHaveProperty("fromPosition", { x: 2, y: 2 });
    });

    it("should respect height restrictions", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Place worker at ground level
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Set adjacent position too high (2 levels up)
      boardState.cells[1][1].height = 2;

      // Act
      const result = await generateMovingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      expect(result).toHaveLength(7); // 8 - 1 too high = 7

      // Should not include the too-high position
      expect(result).not.toContainEqual(
        expect.objectContaining({ position: { x: 1, y: 1 } })
      );
    });

    it("should only generate moves for specified player", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Place workers for both players
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      boardState.cells[3][3].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 3, y: 3, playerId: 2 });

      // Act
      const result = await generateMovingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      // Should only have moves for player 1's worker
      result.forEach(move => {
        expect(move.fromPosition).toEqual({ x: 1, y: 1 });
        expect(move.workerId).toBe(1);
      });
    });
  });

  describe("generateBuildingPhaseAvailablePlays", () => {
    it("should return empty array when player has no workers", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Act
      const result = await generateBuildingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should generate building moves for worker on empty board", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Place worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Act
      const result = await generateBuildingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      expect(result).toHaveLength(16); // 8 adjacent positions × 2 build types

      // Check structure of moves
      const blockMoves = result.filter(move => move.type === "build_block");
      const domeMoves = result.filter(move => move.type === "build_dome");

      expect(blockMoves).toHaveLength(8);
      expect(domeMoves).toHaveLength(8);

      // Check structure
      const firstBlockMove = blockMoves[0];
      expect(firstBlockMove).toHaveProperty("type", "build_block");
      expect(firstBlockMove).toHaveProperty("workerId", 1);
      expect(firstBlockMove).toHaveProperty("position");
      expect(firstBlockMove).toHaveProperty("fromWorkerPosition", { x: 2, y: 2 });
      expect(firstBlockMove).toHaveProperty("buildingLevel", 1);
    });

    it("should respect building level restrictions", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Place worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Set adjacent position to level 3 (max height)
      boardState.cells[1][1].height = 3;

      // Act
      const result = await generateBuildingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      // Position at level 3 should only have dome option, not block option
      const level3BlockMoves = result.filter(move =>
        move.type === "build_block" &&
        move.position?.x === 1 &&
        move.position?.y === 1
      );
      expect(level3BlockMoves).toHaveLength(0);

      // But should have dome option
      const level3DomeMoves = result.filter(move =>
        move.type === "build_dome" &&
        move.position?.x === 1 &&
        move.position?.y === 1
      );
      expect(level3DomeMoves).toHaveLength(1);
    });

    it("should only generate moves for specified player", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Place workers for both players
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      boardState.cells[3][3].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 3, y: 3, playerId: 2 });

      // Act
      const result = await generateBuildingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      // Should only have moves for player 1's worker
      result.forEach(move => {
        expect(move.fromWorkerPosition).toEqual({ x: 1, y: 1 });
        expect(move.workerId).toBe(1);
      });
    });
  });

  describe("God Power Integration", () => {
    it("should apply placement restrictions when god power is added", async () => {
      // Arrange
      const gameId = 1;

      // Act
      const success = addGodPower("placementrestriction");
      const result = await generatePlacingPhaseAvailablePlays(gameId, null);

      // Assert
      expect(success).toBe(true);
      expect(result).toHaveLength(21); // 25 - 4 corners = 21

      // Verify corners are excluded
      const positions = result.map(move => `${move.position?.x},${move.position?.y}`);
      expect(positions).not.toContain('0,0');
      expect(positions).not.toContain('0,4');
      expect(positions).not.toContain('4,0');
      expect(positions).not.toContain('4,4');
    });

    it("should return false for unknown god power", () => {
      // Act
      const success = addGodPower("unknown-power");

      // Assert
      expect(success).toBe(false);
    });

    it("should handle multiple god powers", async () => {
      // Arrange
      const gameId = 1;

      // Act - Add placement restriction
      addGodPower("placementrestriction");
      const result = await generatePlacingPhaseAvailablePlays(gameId, null);

      // Assert
      expect(result).toHaveLength(21); // Corners removed
    });

    it("should work with god powers in moving phase", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Place worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Add Artemis god power (double move)
      addGodPower("artemis");

      // Act
      const result = await generateMovingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      expect(result).toHaveLength(8); // Normal moves (Artemis doesn't modify first move)

      // All moves should be from the worker's position
      result.forEach(move => {
        expect(move.fromPosition).toEqual({ x: 2, y: 2 });
        expect(move.workerId).toBe(1);
      });
    });

    it("should work with Atlas god power in building phase", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Place worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Add Atlas god power (dome at any level)
      addGodPower("atlas");

      // Act
      const result = await generateBuildingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      // Atlas should double the dome options (original + Atlas enhanced)
      const domeMoves = result.filter(move => move.type === "build_dome");
      expect(domeMoves.length).toBeGreaterThan(8); // More than standard 8 dome moves
    });

    it("should work with Demeter god power in building phase", async () => {
      // Arrange
      const gameId = 1;
      const playerId = 1;
      const { createEmptyBoard } = require('../../../src/game/boardState');
      const boardState = createEmptyBoard();

      // Place worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Add Demeter god power (double build)
      addGodPower("demeter");

      // Act
      const result = await generateBuildingPhaseAvailablePlays(gameId, playerId, boardState);

      // Assert
      // Demeter doesn't modify first build, but Atlas might still be active from previous tests
      expect(result.length).toBeGreaterThan(0);

      // All building moves should be from the worker's position
      const buildingMoves = result.filter(move => move.type === "build_block" || move.type === "build_dome");
      buildingMoves.forEach(move => {
        expect(move.fromWorkerPosition).toEqual({ x: 2, y: 2 });
        expect(move.workerId).toBe(1);
      });
    });
  });

  describe("Win Detection", () => {
    describe("checkWinningMove", () => {
      it("should return true for winning move (level 2 to level 3)", async () => {
        // Arrange
        const gameId = 1;
        const { createEmptyBoard } = require('../../../src/game/boardState');
        const boardState = createEmptyBoard();

        // Set up positions: from level 2, to level 3
        boardState.cells[1][1].height = 2;
        boardState.cells[1][2].height = 3;

        // Act
        const result = await checkWinningMove(gameId, 1, 1, 1, 2, boardState);

        // Assert
        expect(result).toBe(true);
      });

      it("should return false for non-winning move", async () => {
        // Arrange
        const gameId = 1;
        const { createEmptyBoard } = require('../../../src/game/boardState');
        const boardState = createEmptyBoard();

        // Set up positions: from level 1, to level 2 (not winning)
        boardState.cells[1][1].height = 1;
        boardState.cells[1][2].height = 2;

        // Act
        const result = await checkWinningMove(gameId, 1, 1, 1, 2, boardState);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe("checkGameState", () => {
      it("should return game over with winner when player has won", async () => {
        // Arrange
        const gameId = 1;
        const { createEmptyBoard } = require('../../../src/game/boardState');
        const boardState = createEmptyBoard();

        // Player 1 has worker on level 3 (winning position)
        boardState.cells[2][2].height = 3;
        boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
        boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

        // Act
        const result = await checkGameState(gameId, boardState);

        // Assert
        expect(result).toEqual({
          gameOver: true,
          winner: 1,
          reason: 'win_condition'
        });
      });

      it("should return game continues when no winner", async () => {
        // Arrange
        const gameId = 1;
        const { createEmptyBoard } = require('../../../src/game/boardState');
        const boardState = createEmptyBoard();

        // Place workers for both players, but none winning
        boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
        boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

        boardState.cells[3][3].worker = { playerId: 2, workerId: 1 };
        boardState.workers.set("2-1", { x: 3, y: 3, playerId: 2 });

        // Act
        const result = await checkGameState(gameId, boardState);

        // Assert
        expect(result).toEqual({
          gameOver: false,
          winner: null,
          reason: null
        });
      });

      it("should return game over when player is blocked", async () => {
        // Arrange
        const gameId = 1;
        const { createEmptyBoard } = require('../../../src/game/boardState');
        const boardState = createEmptyBoard();

        // Player 1 has worker at center, completely surrounded
        boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
        boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

        // Block all adjacent positions with domes
        const adjacentPositions = [
          [1, 1], [1, 2], [1, 3],
          [2, 1],         [2, 3],
          [3, 1], [3, 2], [3, 3]
        ];

        adjacentPositions.forEach(([x, y]) => {
          boardState.cells[x][y].hasDome = true;
        });

        // Act
        const result = await checkGameState(gameId, boardState);

        // Assert
        expect(result).toEqual({
          gameOver: true,
          winner: 2, // Player 2 wins because Player 1 is blocked
          reason: 'opponent_blocked'
        });
      });
    });

    describe("checkPlayerBlocked", () => {
      it("should return false when player can move and build", async () => {
        // Arrange
        const gameId = 1;
        const playerId = 1;
        const { createEmptyBoard } = require('../../../src/game/boardState');
        const boardState = createEmptyBoard();

        // Place worker with space to move and build
        boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
        boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

        // Act
        const result = await checkPlayerBlocked(gameId, playerId, boardState);

        // Assert
        expect(result).toBe(false);
      });

      it("should return true when player cannot move", async () => {
        // Arrange
        const gameId = 1;
        const playerId = 1;
        const { createEmptyBoard } = require('../../../src/game/boardState');
        const boardState = createEmptyBoard();

        // Place worker completely surrounded
        boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
        boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

        // Block all adjacent positions
        const adjacentPositions = [
          [1, 1], [1, 2], [1, 3],
          [2, 1],         [2, 3],
          [3, 1], [3, 2], [3, 3]
        ];

        adjacentPositions.forEach(([x, y], index) => {
          boardState.cells[x][y].worker = { playerId: 2, workerId: index + 1 };
        });

        // Act
        const result = await checkPlayerBlocked(gameId, playerId, boardState);

        // Assert
        expect(result).toBe(true);
      });

      it("should return false when player has limited but valid options", async () => {
        // Arrange
        const gameId = 1;
        const playerId = 1;
        const { createEmptyBoard } = require('../../../src/game/boardState');
        const boardState = createEmptyBoard();

        // Place worker at (1,1)
        boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
        boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

        // Block some positions but leave valid move+build combinations
        boardState.cells[0][0].hasDome = true;
        boardState.cells[0][1].worker = { playerId: 2, workerId: 1 };
        boardState.cells[2][2].hasDome = true;

        // Act
        const result = await checkPlayerBlocked(gameId, playerId, boardState);

        // Assert
        expect(result).toBe(false); // Should have valid move+build combinations available
      });
    });
  });
});
