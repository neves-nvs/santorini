import {
  createEmptyBoard,
  isWinningMove,
  checkPlayerWin,
  checkGameWinner,
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
});
