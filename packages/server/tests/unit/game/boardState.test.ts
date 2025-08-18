import {
  createEmptyBoard,
  isValidPosition,
  isPositionOccupied,
  hasdome,
  getHeight,
  getEmptyPositions,
  getPlayerWorkers,
  countPlayerWorkers,
  isPlacingPhaseComplete,
  isPlacingPhaseCompleteForAll,
  BoardState
} from "../../../src/game/boardState";

describe("BoardState", () => {
  let boardState: BoardState;

  beforeEach(() => {
    boardState = createEmptyBoard();
  });

  describe("Game Setup", () => {
    it("should create a fresh game board ready for play", () => {
      // BEHAVIOR: "New games start with an empty board"

      // Assert: Board is ready for worker placement
      const emptyPositions = getEmptyPositions(boardState);
      expect(emptyPositions).toHaveLength(25); // All positions available

      // Assert: No workers on the board yet
      expect(countPlayerWorkers(boardState, 1)).toBe(0);
      expect(countPlayerWorkers(boardState, 2)).toBe(0);

      // Assert: No buildings constructed yet
      expect(getHeight(boardState, 2, 2)).toBe(0); // Center position empty
      expect(hasdome(boardState, 2, 2)).toBe(false); // No domes
    });
  });

  describe("isValidPosition", () => {
    it("should return true for valid positions", () => {
      expect(isValidPosition(0, 0)).toBe(true);
      expect(isValidPosition(2, 2)).toBe(true);
      expect(isValidPosition(4, 4)).toBe(true);
    });

    it("should return false for invalid positions", () => {
      expect(isValidPosition(-1, 0)).toBe(false);
      expect(isValidPosition(0, -1)).toBe(false);
      expect(isValidPosition(5, 0)).toBe(false);
      expect(isValidPosition(0, 5)).toBe(false);
      expect(isValidPosition(5, 5)).toBe(false);
    });
  });

  describe("isPositionOccupied", () => {
    it("should return false for empty positions", () => {
      expect(isPositionOccupied(boardState, 2, 2)).toBe(false);
    });

    it("should return true for occupied positions", () => {
      // Place a worker
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      
      expect(isPositionOccupied(boardState, 2, 2)).toBe(true);
    });

    it("should return true for invalid positions", () => {
      expect(isPositionOccupied(boardState, -1, 0)).toBe(true);
      expect(isPositionOccupied(boardState, 5, 5)).toBe(true);
    });
  });

  describe("hasdome", () => {
    it("should return false for positions without domes", () => {
      expect(hasdome(boardState, 2, 2)).toBe(false);
    });

    it("should return true for positions with domes", () => {
      boardState.cells[2][2].hasDome = true;
      
      expect(hasdome(boardState, 2, 2)).toBe(true);
    });

    it("should return true for invalid positions", () => {
      expect(hasdome(boardState, -1, 0)).toBe(true);
      expect(hasdome(boardState, 5, 5)).toBe(true);
    });
  });

  describe("getHeight", () => {
    it("should return 0 for empty positions", () => {
      expect(getHeight(boardState, 2, 2)).toBe(0);
    });

    it("should return correct height for built positions", () => {
      boardState.cells[2][2].height = 3;
      
      expect(getHeight(boardState, 2, 2)).toBe(3);
    });

    it("should return 0 for invalid positions", () => {
      expect(getHeight(boardState, -1, 0)).toBe(0);
      expect(getHeight(boardState, 5, 5)).toBe(0);
    });
  });

  describe("getEmptyPositions", () => {
    it("should return all 25 positions for empty board", () => {
      const emptyPositions = getEmptyPositions(boardState);
      
      expect(emptyPositions).toHaveLength(25);
      expect(emptyPositions).toContainEqual({ x: 0, y: 0 });
      expect(emptyPositions).toContainEqual({ x: 4, y: 4 });
      expect(emptyPositions).toContainEqual({ x: 2, y: 2 });
    });

    it("should exclude occupied positions", () => {
      // Place workers
      boardState.cells[0][0].worker = { playerId: 1, workerId: 1 };
      boardState.cells[4][4].worker = { playerId: 2, workerId: 1 };
      
      const emptyPositions = getEmptyPositions(boardState);
      
      expect(emptyPositions).toHaveLength(23);
      expect(emptyPositions).not.toContainEqual({ x: 0, y: 0 });
      expect(emptyPositions).not.toContainEqual({ x: 4, y: 4 });
      expect(emptyPositions).toContainEqual({ x: 2, y: 2 });
    });
  });

  describe("Worker Management", () => {
    beforeEach(() => {
      // Set up some workers
      boardState.cells[0][0].worker = { playerId: 1, workerId: 1 };
      boardState.cells[1][1].worker = { playerId: 1, workerId: 2 };
      boardState.cells[3][3].worker = { playerId: 2, workerId: 1 };
      
      boardState.workers.set("1-1", { x: 0, y: 0, playerId: 1 });
      boardState.workers.set("1-2", { x: 1, y: 1, playerId: 1 });
      boardState.workers.set("2-1", { x: 3, y: 3, playerId: 2 });
    });

    describe("getPlayerWorkers", () => {
      it("should return workers for specific player", () => {
        const player1Workers = getPlayerWorkers(boardState, 1);
        const player2Workers = getPlayerWorkers(boardState, 2);
        
        expect(player1Workers).toHaveLength(2);
        expect(player2Workers).toHaveLength(1);
        
        expect(player1Workers).toContainEqual({ x: 0, y: 0, workerId: 1 });
        expect(player1Workers).toContainEqual({ x: 1, y: 1, workerId: 2 });
        expect(player2Workers).toContainEqual({ x: 3, y: 3, workerId: 1 });
      });

      it("should return empty array for player with no workers", () => {
        const player3Workers = getPlayerWorkers(boardState, 3);
        expect(player3Workers).toHaveLength(0);
      });
    });

    describe("countPlayerWorkers", () => {
      it("should count workers correctly", () => {
        expect(countPlayerWorkers(boardState, 1)).toBe(2);
        expect(countPlayerWorkers(boardState, 2)).toBe(1);
        expect(countPlayerWorkers(boardState, 3)).toBe(0);
      });
    });

    describe("isPlacingPhaseComplete", () => {
      it("should return true when player has 2 workers", () => {
        expect(isPlacingPhaseComplete(boardState, 1)).toBe(true);
      });

      it("should return false when player has less than 2 workers", () => {
        expect(isPlacingPhaseComplete(boardState, 2)).toBe(false);
        expect(isPlacingPhaseComplete(boardState, 3)).toBe(false);
      });
    });

    describe("isPlacingPhaseCompleteForAll", () => {
      it("should return false when not all players have 2 workers", () => {
        expect(isPlacingPhaseCompleteForAll(boardState, 2)).toBe(false);
      });

      it("should return true when all players have 2 workers", () => {
        // Add second worker for player 2
        boardState.cells[4][4].worker = { playerId: 2, workerId: 2 };
        boardState.workers.set("2-2", { x: 4, y: 4, playerId: 2 });
        
        expect(isPlacingPhaseCompleteForAll(boardState, 2)).toBe(true);
      });
    });
  });
});
