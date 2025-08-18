import {
  GameEngine,
  StandardMoveGenerator,
  GameHook,
  GameContext,
  Play,
  MoveGenerator
} from "../../../src/game/gameEngine";
import { createEmptyBoard, BoardState } from "../../../src/game/boardState";

describe("GameEngine", () => {
  let gameEngine: GameEngine;
  let mockContext: GameContext;

  beforeEach(() => {
    gameEngine = new GameEngine();
    mockContext = {
      gameId: 1,
      currentPhase: 'placing',
      currentPlayerId: 1
    };
  });

  describe("StandardMoveGenerator", () => {
    let moveGenerator: StandardMoveGenerator;

    beforeEach(() => {
      moveGenerator = new StandardMoveGenerator();
    });

    describe("generatePlacingMoves", () => {
      it("should generate 25 placing moves for 5x5 board", () => {
        const moves = moveGenerator.generatePlacingMoves(mockContext);
        
        expect(moves).toHaveLength(25);
      });

      it("should generate moves with correct structure", () => {
        const moves = moveGenerator.generatePlacingMoves(mockContext);
        
        expect(moves[0]).toEqual({
          type: "place_worker",
          position: { x: 0, y: 0 }
        });
        
        expect(moves[24]).toEqual({
          type: "place_worker",
          position: { x: 4, y: 4 }
        });
      });

      it("should generate all unique positions", () => {
        const moves = moveGenerator.generatePlacingMoves(mockContext);
        const positions = moves.map(move => `${move.position?.x},${move.position?.y}`);
        const uniquePositions = new Set(positions);

        expect(uniquePositions.size).toBe(25);
      });

      it("should exclude occupied positions when board state is provided", () => {
        const boardState = createEmptyBoard();

        // Place some workers
        boardState.cells[0][0].worker = { playerId: 1, workerId: 1 };
        boardState.cells[2][2].worker = { playerId: 2, workerId: 1 };
        boardState.workers.set("1-1", { x: 0, y: 0, playerId: 1 });
        boardState.workers.set("2-1", { x: 2, y: 2, playerId: 2 });

        const contextWithBoard = {
          ...mockContext,
          boardState
        };

        const moves = moveGenerator.generatePlacingMoves(contextWithBoard);

        // Should have 25 - 2 occupied = 23 moves
        expect(moves).toHaveLength(23);

        // Check that occupied positions are not included
        const positions = moves.map(move => `${move.position?.x},${move.position?.y}`);
        expect(positions).not.toContain('0,0');
        expect(positions).not.toContain('2,2');

        // Check that empty positions are still included
        expect(positions).toContain('1,1');
        expect(positions).toContain('4,4');
      });

      it("should return empty array when all positions are occupied", () => {
        const boardState = createEmptyBoard();

        // Fill the entire board with workers
        let workerId = 1;
        for (let x = 0; x < 5; x++) {
          for (let y = 0; y < 5; y++) {
            boardState.cells[x][y].worker = { playerId: 1, workerId: workerId++ };
          }
        }

        const contextWithBoard = {
          ...mockContext,
          boardState
        };

        const moves = moveGenerator.generatePlacingMoves(contextWithBoard);
        expect(moves).toHaveLength(0);
      });
    });
  });

  describe("Hook System", () => {
    it("should start with no hooks", () => {
      const moves = gameEngine.generateAvailablePlays(mockContext);
      
      expect(moves).toHaveLength(25); // Standard 5x5 board
    });

    it("should add hooks and apply them in priority order", () => {
      const hook1: GameHook = {
        name: "test-hook-1",
        priority: 2,
        modifyPlacingMoves: (moves) => moves.slice(0, 10) // Keep only first 10
      };

      const hook2: GameHook = {
        name: "test-hook-2", 
        priority: 1,
        modifyPlacingMoves: (moves) => moves.slice(0, 20) // Keep only first 20
      };

      gameEngine.addHook(hook1);
      gameEngine.addHook(hook2);

      const moves = gameEngine.generateAvailablePlays(mockContext);
      
      // hook2 runs first (priority 1), then hook1 (priority 2)
      // So we should get 10 moves (20 -> 10)
      expect(moves).toHaveLength(10);
    });

    it("should remove hooks by name", () => {
      const hook: GameHook = {
        name: "removable-hook",
        modifyPlacingMoves: (moves) => moves.slice(0, 5)
      };

      gameEngine.addHook(hook);
      expect(gameEngine.generateAvailablePlays(mockContext)).toHaveLength(5);

      gameEngine.removeHook("removable-hook");
      expect(gameEngine.generateAvailablePlays(mockContext)).toHaveLength(25);
    });
  });

  describe("Turn Processing", () => {
    it("should process beforeTurn hooks", () => {
      const hook: GameHook = {
        name: "before-turn-hook",
        beforeTurn: (context) => ({
          ...context,
          currentPlayerId: 999 // Change player ID
        })
      };

      gameEngine.addHook(hook);
      const result = gameEngine.processBeforeTurn(mockContext);

      expect(result.currentPlayerId).toBe(999);
      expect(result.gameId).toBe(mockContext.gameId); // Other properties unchanged
    });

    it("should process afterTurn hooks", () => {
      const hook: GameHook = {
        name: "after-turn-hook",
        afterTurn: (context) => ({
          ...context,
          currentPhase: 'moving' as const
        })
      };

      gameEngine.addHook(hook);
      const result = gameEngine.processAfterTurn(mockContext);

      expect(result.currentPhase).toBe('moving');
    });

    it("should chain multiple turn hooks", () => {
      const hook1: GameHook = {
        name: "hook-1",
        priority: 1,
        beforeTurn: (context) => ({
          ...context,
          currentPlayerId: (context.currentPlayerId || 0) + 1
        })
      };

      const hook2: GameHook = {
        name: "hook-2", 
        priority: 2,
        beforeTurn: (context) => ({
          ...context,
          currentPlayerId: (context.currentPlayerId || 0) * 2
        })
      };

      gameEngine.addHook(hook1);
      gameEngine.addHook(hook2);

      const result = gameEngine.processBeforeTurn(mockContext);

      // Should be (1 + 1) * 2 = 4
      expect(result.currentPlayerId).toBe(4);
    });
  });

  describe("Phase-specific behavior", () => {
    it("should only apply placing hooks during placing phase", () => {
      const placingHook: GameHook = {
        name: "placing-only",
        modifyPlacingMoves: (moves) => moves.slice(0, 5)
      };

      gameEngine.addHook(placingHook);

      // Placing phase - hook should apply
      const placingMoves = gameEngine.generateAvailablePlays({
        ...mockContext,
        currentPhase: 'placing'
      });
      expect(placingMoves).toHaveLength(5);

      // Moving phase - hook should not apply (but no moves generated yet)
      const movingMoves = gameEngine.generateAvailablePlays({
        ...mockContext,
        currentPhase: 'moving'
      });
      expect(movingMoves).toHaveLength(0); // No moving moves implemented yet
    });
  });
});
