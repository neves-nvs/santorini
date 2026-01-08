import { GameEngine, GameContext } from "@santorini/game-engine";
import { createEmptyBoard, BoardState } from "@santorini/game-engine";

describe("Moving Phase", () => {
  let gameEngine: GameEngine;
  let boardState: BoardState;
  let movingContext: GameContext;

  beforeEach(() => {
    gameEngine = new GameEngine();
    boardState = createEmptyBoard();
    movingContext = {
      gameId: 1,
      currentPhase: 'moving',
      currentPlayerId: 1,
      boardState,
      playerCount: 2
    };
  });

  describe("StandardMoveGenerator - generateMovingMoves", () => {
    it("should return empty array when no board state provided", () => {
      const contextWithoutBoard = {
        ...movingContext,
        boardState: undefined
      };

      const moves = gameEngine.generateAvailablePlays(contextWithoutBoard);
      expect(moves).toEqual([]);
    });

    it("should return empty array when no current player provided", () => {
      const contextWithoutPlayer = {
        ...movingContext,
        currentPlayerId: undefined
      };

      const moves = gameEngine.generateAvailablePlays(contextWithoutPlayer);
      expect(moves).toEqual([]);
    });

    it("should return empty array when player has no workers", () => {
      // No workers placed for player 1
      const moves = gameEngine.generateAvailablePlays(movingContext);
      expect(moves).toEqual([]);
    });

    it("should generate moves for worker on empty board", () => {
      // Place worker at center of board
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      const moves = gameEngine.generateAvailablePlays(movingContext);

      // Should have 8 moves (all adjacent positions)
      expect(moves).toHaveLength(8);

      // Check that all moves are adjacent to (2,2)
      const expectedPositions = [
        { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 },
        { x: 2, y: 1 },                 { x: 2, y: 3 },
        { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }
      ];

      for (const expectedPos of expectedPositions) {
        expect(moves).toContainEqual({
          type: "move_worker",
          workerId: 1,
          position: expectedPos,
          fromPosition: { x: 2, y: 2 }
        });
      }
    });

    it("should exclude occupied positions", () => {
      // Place worker at (2,2)
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Place another worker at (1,1) - blocks one adjacent position
      boardState.cells[1][1].worker = { playerId: 2, workerId: 1 };

      const moves = gameEngine.generateAvailablePlays(movingContext);

      // Should have 7 moves (8 - 1 occupied)
      expect(moves).toHaveLength(7);

      // Should not include the occupied position
      expect(moves).not.toContainEqual(
        expect.objectContaining({ position: { x: 1, y: 1 } })
      );
    });

    it("should exclude domed positions", () => {
      // Place worker at (2,2)
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Place dome at (1,1)
      boardState.cells[1][1].hasDome = true;

      const moves = gameEngine.generateAvailablePlays(movingContext);

      // Should have 7 moves (8 - 1 domed)
      expect(moves).toHaveLength(7);

      // Should not include the domed position
      expect(moves).not.toContainEqual(
        expect.objectContaining({ position: { x: 1, y: 1 } })
      );
    });

    it("should respect height restrictions - can move up 1 level", () => {
      // Place worker at ground level (2,2)
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Set adjacent positions to different heights
      boardState.cells[1][1].height = 1; // Can move up 1 level
      boardState.cells[1][2].height = 2; // Can't move up 2 levels
      boardState.cells[2][1].height = 0; // Can move to same level

      const moves = gameEngine.generateAvailablePlays(movingContext);

      // Should include level 1 position
      expect(moves).toContainEqual({
        type: "move_worker",
        workerId: 1,
        position: { x: 1, y: 1 },
        fromPosition: { x: 2, y: 2 }
      });

      // Should include level 0 position
      expect(moves).toContainEqual({
        type: "move_worker",
        workerId: 1,
        position: { x: 2, y: 1 },
        fromPosition: { x: 2, y: 2 }
      });

      // Should NOT include level 2 position (too high)
      expect(moves).not.toContainEqual(
        expect.objectContaining({ position: { x: 1, y: 2 } })
      );
    });

    it("should allow moving down any number of levels", () => {
      // Place worker at level 3 (2,2)
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.cells[2][2].height = 3;
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Set adjacent positions to different heights
      boardState.cells[1][1].height = 0; // Can move down 3 levels
      boardState.cells[1][2].height = 1; // Can move down 2 levels
      boardState.cells[2][1].height = 2; // Can move down 1 level

      const moves = gameEngine.generateAvailablePlays(movingContext);

      // Should include all downward moves
      expect(moves).toContainEqual({
        type: "move_worker",
        workerId: 1,
        position: { x: 1, y: 1 },
        fromPosition: { x: 2, y: 2 }
      });

      expect(moves).toContainEqual({
        type: "move_worker",
        workerId: 1,
        position: { x: 1, y: 2 },
        fromPosition: { x: 2, y: 2 }
      });

      expect(moves).toContainEqual({
        type: "move_worker",
        workerId: 1,
        position: { x: 2, y: 1 },
        fromPosition: { x: 2, y: 2 }
      });
    });

    it("should handle worker at board edge", () => {
      // Place worker at corner (0,0)
      boardState.cells[0][0].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 0, y: 0, playerId: 1 });

      const moves = gameEngine.generateAvailablePlays(movingContext);

      // Should have 3 moves (only 3 adjacent positions from corner)
      expect(moves).toHaveLength(3);

      const expectedPositions = [
        { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1 }
      ];

      for (const expectedPos of expectedPositions) {
        expect(moves).toContainEqual({
          type: "move_worker",
          workerId: 1,
          position: expectedPos,
          fromPosition: { x: 0, y: 0 }
        });
      }
    });

    it("should generate moves for multiple workers", () => {
      // Place two workers for player 1
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      boardState.cells[3][3].worker = { playerId: 1, workerId: 2 };
      boardState.workers.set("1-2", { x: 3, y: 3, playerId: 1 });

      const moves = gameEngine.generateAvailablePlays(movingContext);

      // Should have moves for both workers
      const worker1Moves = moves.filter(move => move.workerId === 1);
      const worker2Moves = moves.filter(move => move.workerId === 2);

      expect(worker1Moves.length).toBeGreaterThan(0);
      expect(worker2Moves.length).toBeGreaterThan(0);

      // Check that moves have correct fromPosition
      worker1Moves.forEach(move => {
        expect(move.fromPosition).toEqual({ x: 1, y: 1 });
      });

      worker2Moves.forEach(move => {
        expect(move.fromPosition).toEqual({ x: 3, y: 3 });
      });
    });

    it("should only generate moves for current player's workers", () => {
      // Place workers for both players
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      boardState.cells[3][3].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 3, y: 3, playerId: 2 });

      // Set current player to 1
      movingContext.currentPlayerId = 1;

      const moves = gameEngine.generateAvailablePlays(movingContext);

      // Should only have moves for player 1's worker
      moves.forEach(move => {
        expect(move.fromPosition).toEqual({ x: 1, y: 1 });
        expect(move.workerId).toBe(1);
      });

      // Should not have any moves from player 2's worker position
      expect(moves).not.toContainEqual(
        expect.objectContaining({ fromPosition: { x: 3, y: 3 } })
      );
    });
  });
});
