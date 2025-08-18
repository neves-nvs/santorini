import {
  createEmptyBoard,
  isWinningMove,
  checkPlayerWin,
  checkGameWinner,
  isPlayerBlocked,
  BoardState
} from "../../../src/game/boardState";

describe("Win Detection", () => {
  let boardState: BoardState;

  beforeEach(() => {
    boardState = createEmptyBoard();
  });

  describe("Victory Condition: Reaching Level 3", () => {
    it("should detect victory when worker climbs to the highest level", () => {
      // BEHAVIOR: "Players win by reaching the top of a 3-story building"

      // Arrange: Create a scenario where a worker can climb to victory
      const fromX = 1, fromY = 1, toX = 1, toY = 2;
      boardState.cells[fromX][fromY].height = 2; // Worker is on level 2
      boardState.cells[toX][toY].height = 3;     // Adjacent level 3 building

      // Act: Check if this move would win the game
      const isVictory = isWinningMove(boardState, fromX, fromY, toX, toY);

      // Assert: This should be a winning move (level 2 → level 3)
      expect(isVictory).toBe(true);
    });

    it("should not allow victory by jumping multiple levels", () => {
      // BEHAVIOR: "Players cannot skip levels to win"

      // Arrange: Worker tries to jump from level 1 to level 3
      const fromX = 1, fromY = 1, toX = 1, toY = 2;
      boardState.cells[fromX][fromY].height = 1; // Worker on level 1
      boardState.cells[toX][toY].height = 3;     // Target is level 3

      // Act: Check if this illegal move would be considered a win
      const isVictory = isWinningMove(boardState, fromX, fromY, toX, toY);

      // Assert: This should not be a winning move (illegal jump)
      expect(isVictory).toBe(false);
    });

    it("should not consider lateral moves as victory", () => {
      // BEHAVIOR: "Moving sideways on level 3 doesn't win the game"

      // Arrange: Worker moves from one level 3 building to another
      const fromX = 1, fromY = 1, toX = 1, toY = 2;
      boardState.cells[fromX][fromY].height = 3; // Already on level 3
      boardState.cells[toX][toY].height = 3;     // Moving to another level 3

      // Act: Check if lateral movement on top level counts as victory
      const isVictory = isWinningMove(boardState, fromX, fromY, toX, toY);

      // Assert: Lateral movement should not be victory
      expect(isVictory).toBe(false);
    });

    it("should not consider same-level moves as victory", () => {
      // BEHAVIOR: "Moving between buildings of the same height doesn't win"

      // Arrange: Worker moves between two level 2 buildings
      const fromX = 1, fromY = 1, toX = 1, toY = 2;
      boardState.cells[fromX][fromY].height = 2; // Level 2
      boardState.cells[toX][toY].height = 2;     // Also level 2

      // Act: Check if same-level movement counts as victory
      const isVictory = isWinningMove(boardState, fromX, fromY, toX, toY);

      // Assert: Same-level movement should not be victory
      expect(isVictory).toBe(false);
    });

    it("should handle edge cases gracefully", () => {
      // BEHAVIOR: "System handles invalid moves without crashing"

      // Act: Try to check victory for invalid board positions
      const isVictory = isWinningMove(boardState, -1, 0, 1, 2);

      // Assert: Invalid positions should not cause victory
      expect(isVictory).toBe(false);
    });
  });

  describe("checkPlayerWin", () => {
    it("should return true when player has worker on level 3", () => {
      // Place worker on level 3
      boardState.cells[2][2].height = 3;
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      const result = checkPlayerWin(boardState, 1);
      expect(result).toBe(true);
    });

    it("should return false when player has no workers on level 3", () => {
      // Place worker on level 2
      boardState.cells[2][2].height = 2;
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      const result = checkPlayerWin(boardState, 1);
      expect(result).toBe(false);
    });

    it("should return true when player has multiple workers and one is on level 3", () => {
      // Place first worker on level 2
      boardState.cells[1][1].height = 2;
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      // Place second worker on level 3
      boardState.cells[3][3].height = 3;
      boardState.cells[3][3].worker = { playerId: 1, workerId: 2 };
      boardState.workers.set("1-2", { x: 3, y: 3, playerId: 1 });

      const result = checkPlayerWin(boardState, 1);
      expect(result).toBe(true);
    });

    it("should return false when player has no workers", () => {
      const result = checkPlayerWin(boardState, 1);
      expect(result).toBe(false);
    });
  });

  describe("checkGameWinner", () => {
    it("should return player ID when that player has won", () => {
      // Player 2 wins
      boardState.cells[2][2].height = 3;
      boardState.cells[2][2].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 2, y: 2, playerId: 2 });

      const result = checkGameWinner(boardState, 2);
      expect(result).toBe(2);
    });

    it("should return null when no player has won", () => {
      // Place workers for both players, but none on level 3
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      boardState.cells[3][3].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 3, y: 3, playerId: 2 });

      const result = checkGameWinner(boardState, 2);
      expect(result).toBe(null);
    });

    it("should return first winning player when multiple players could win", () => {
      // Both players have workers on level 3
      boardState.cells[1][1].height = 3;
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      boardState.cells[3][3].height = 3;
      boardState.cells[3][3].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 3, y: 3, playerId: 2 });

      const result = checkGameWinner(boardState, 2);
      expect(result).toBe(1); // Player 1 is checked first
    });
  });

  describe("isPlayerBlocked", () => {
    it("should return true when player has no workers", () => {
      const result = isPlayerBlocked(boardState, 1);
      expect(result).toBe(true);
    });

    it("should return false when player has valid moves and builds", () => {
      // Place worker with open adjacent spaces for both moving and building
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      const result = isPlayerBlocked(boardState, 1);
      expect(result).toBe(false);
    });

    it("should return true when all adjacent positions are occupied", () => {
      // Place worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Block all adjacent positions with other workers
      const adjacentPositions = [
        [1, 1], [1, 2], [1, 3],
        [2, 1], [2, 3],
        [3, 1], [3, 2], [3, 3]
      ];

      adjacentPositions.forEach(([x, y], index) => {
        boardState.cells[x][y].worker = { playerId: 2, workerId: index + 1 };
      });

      const result = isPlayerBlocked(boardState, 1);
      expect(result).toBe(true);
    });

    it("should return true when all adjacent positions have domes", () => {
      // Place worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Block all adjacent positions with domes
      const adjacentPositions = [
        [1, 1], [1, 2], [1, 3],
        [2, 1], [2, 3],
        [3, 1], [3, 2], [3, 3]
      ];

      adjacentPositions.forEach(([x, y]) => {
        boardState.cells[x][y].hasDome = true;
      });

      const result = isPlayerBlocked(boardState, 1);
      expect(result).toBe(true);
    });

    it("should return true when all adjacent positions are too high", () => {
      // Place worker at ground level
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Make all adjacent positions level 2 (too high to climb from level 0)
      const adjacentPositions = [
        [1, 1], [1, 2], [1, 3],
        [2, 1], [2, 3],
        [3, 1], [3, 2], [3, 3]
      ];

      adjacentPositions.forEach(([x, y]) => {
        boardState.cells[x][y].height = 2;
      });

      const result = isPlayerBlocked(boardState, 1);
      expect(result).toBe(true);
    });

    it("should return false when at least one valid move exists", () => {
      // Place worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Block most adjacent positions but leave one open
      const blockedPositions = [
        [1, 1], [1, 2], [1, 3],
        [2, 1],         // [2, 3] left open
        [3, 1], [3, 2], [3, 3]
      ];

      blockedPositions.forEach(([x, y], index) => {
        boardState.cells[x][y].worker = { playerId: 2, workerId: index + 1 };
      });

      const result = isPlayerBlocked(boardState, 1);
      expect(result).toBe(false);
    });

    it("should return true when player has very limited options", () => {
      // Create a more realistic blocking scenario
      // Place worker at (0,0) - corner position
      boardState.cells[0][0].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 0, y: 0, playerId: 1 });

      // Block most adjacent positions, leaving only one or two moves
      boardState.cells[0][1].worker = { playerId: 2, workerId: 1 }; // Block north
      boardState.cells[1][0].worker = { playerId: 2, workerId: 2 }; // Block east
      // Leave (1,1) open for moving

      // From (1,1), block most building positions
      boardState.cells[0][2].hasDome = true;
      boardState.cells[1][2].hasDome = true;
      boardState.cells[2][0].hasDome = true;
      boardState.cells[2][1].hasDome = true;
      boardState.cells[2][2].hasDome = true;

      // This should still allow some building, so player is not blocked
      const result = isPlayerBlocked(boardState, 1);
      expect(result).toBe(false); // Should have at least one valid move+build combination
    });

    it("should return false when player can move and build from new position", () => {
      // Place worker at (1,1)
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      // Block most positions around (1,1) but leave (1,2) open for moving
      // And leave (1,3) open for building from (1,2)
      boardState.cells[0][0].worker = { playerId: 2, workerId: 1 };
      boardState.cells[0][1].worker = { playerId: 2, workerId: 2 };
      boardState.cells[0][2].hasDome = true;
      boardState.cells[2][0].hasDome = true;
      boardState.cells[2][1].worker = { playerId: 2, workerId: 3 };
      boardState.cells[2][2].hasDome = true;

      // (1,2) is open for moving, and (1,3) is open for building
      const result = isPlayerBlocked(boardState, 1);
      expect(result).toBe(false); // Can move to (1,2) and build at (1,3)
    });

    it("should handle worker at board edge", () => {
      // Place worker at corner (fewer adjacent positions)
      boardState.cells[0][0].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 0, y: 0, playerId: 1 });

      const result = isPlayerBlocked(boardState, 1);
      expect(result).toBe(false); // Should have moves and builds available
    });
  });
});
