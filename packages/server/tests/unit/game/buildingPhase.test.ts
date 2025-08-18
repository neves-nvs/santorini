import { GameEngine, GameContext } from "../../../src/game/gameEngine";
import { createEmptyBoard, BoardState } from "../../../src/game/boardState";

describe("Building Phase", () => {
  let gameEngine: GameEngine;
  let boardState: BoardState;
  let buildingContext: GameContext;

  beforeEach(() => {
    gameEngine = new GameEngine();
    boardState = createEmptyBoard();
    buildingContext = {
      gameId: 1,
      currentPhase: 'building',
      currentPlayerId: 1,
      boardState,
      playerCount: 2
    };
  });

  describe("StandardMoveGenerator - generateBuildingMoves", () => {
    it("should return empty array when no board state provided", () => {
      const contextWithoutBoard = {
        ...buildingContext,
        boardState: undefined
      };

      const moves = gameEngine.generateAvailablePlays(contextWithoutBoard);
      expect(moves).toEqual([]);
    });

    it("should return empty array when no current player provided", () => {
      const contextWithoutPlayer = {
        ...buildingContext,
        currentPlayerId: undefined
      };

      const moves = gameEngine.generateAvailablePlays(contextWithoutPlayer);
      expect(moves).toEqual([]);
    });

    it("should return empty array when player has no workers", () => {
      // No workers placed for player 1
      const moves = gameEngine.generateAvailablePlays(buildingContext);
      expect(moves).toEqual([]);
    });

    it("should generate building moves for worker on empty board", () => {
      // Place worker at center of board
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      const moves = gameEngine.generateAvailablePlays(buildingContext);

      // Should have 16 moves (8 adjacent positions × 2 build types each)
      // Each position can have: build_block (level 1) + build_dome
      expect(moves).toHaveLength(16);

      // Check that we have both block and dome options for each adjacent position
      const blockMoves = moves.filter(move => move.type === "build_block");
      const domeMoves = moves.filter(move => move.type === "build_dome");
      
      expect(blockMoves).toHaveLength(8);
      expect(domeMoves).toHaveLength(8);

      // Check structure of block move
      const firstBlockMove = blockMoves[0];
      expect(firstBlockMove).toHaveProperty("type", "build_block");
      expect(firstBlockMove).toHaveProperty("workerId", 1);
      expect(firstBlockMove).toHaveProperty("position");
      expect(firstBlockMove).toHaveProperty("fromWorkerPosition", { x: 2, y: 2 });
      expect(firstBlockMove).toHaveProperty("buildingLevel", 1);

      // Check structure of dome move
      const firstDomeMove = domeMoves[0];
      expect(firstDomeMove).toHaveProperty("type", "build_dome");
      expect(firstDomeMove).toHaveProperty("workerId", 1);
      expect(firstDomeMove).toHaveProperty("position");
      expect(firstDomeMove).toHaveProperty("fromWorkerPosition", { x: 2, y: 2 });
      expect(firstDomeMove).toHaveProperty("buildingType", "dome");
    });

    it("should exclude occupied positions", () => {
      // Place worker at (2,2)
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Place another worker at (1,1) - blocks one adjacent position
      boardState.cells[1][1].worker = { playerId: 2, workerId: 1 };

      const moves = gameEngine.generateAvailablePlays(buildingContext);

      // Should have 14 moves (7 adjacent positions × 2 build types each)
      expect(moves).toHaveLength(14);

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

      const moves = gameEngine.generateAvailablePlays(buildingContext);

      // Should have 14 moves (7 adjacent positions × 2 build types each)
      expect(moves).toHaveLength(14);

      // Should not include the domed position
      expect(moves).not.toContainEqual(
        expect.objectContaining({ position: { x: 1, y: 1 } })
      );
    });

    it("should generate correct building levels based on current height", () => {
      // Place worker at (2,2)
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Set different heights for adjacent positions
      boardState.cells[1][1].height = 0; // Ground level - can build level 1
      boardState.cells[1][2].height = 1; // Level 1 - can build level 2
      boardState.cells[2][1].height = 2; // Level 2 - can build level 3
      boardState.cells[3][3].height = 3; // Level 3 - can only build dome

      const moves = gameEngine.generateAvailablePlays(buildingContext);

      // Check level 1 building (from ground)
      expect(moves).toContainEqual({
        type: "build_block",
        workerId: 1,
        position: { x: 1, y: 1 },
        fromWorkerPosition: { x: 2, y: 2 },
        buildingLevel: 1
      });

      // Check level 2 building
      expect(moves).toContainEqual({
        type: "build_block",
        workerId: 1,
        position: { x: 1, y: 2 },
        fromWorkerPosition: { x: 2, y: 2 },
        buildingLevel: 2
      });

      // Check level 3 building
      expect(moves).toContainEqual({
        type: "build_block",
        workerId: 1,
        position: { x: 2, y: 1 },
        fromWorkerPosition: { x: 2, y: 2 },
        buildingLevel: 3
      });

      // Level 3 position should NOT have block building option (already at max)
      expect(moves).not.toContainEqual(
        expect.objectContaining({ 
          position: { x: 3, y: 3 },
          type: "build_block"
        })
      );

      // But should still have dome option
      expect(moves).toContainEqual({
        type: "build_dome",
        workerId: 1,
        position: { x: 3, y: 3 },
        fromWorkerPosition: { x: 2, y: 2 },
        buildingType: "dome"
      });
    });

    it("should handle worker at board edge", () => {
      // Place worker at corner (0,0)
      boardState.cells[0][0].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 0, y: 0, playerId: 1 });

      const moves = gameEngine.generateAvailablePlays(buildingContext);

      // Should have 6 moves (3 adjacent positions × 2 build types each)
      expect(moves).toHaveLength(6);

      const expectedPositions = [
        { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1 }
      ];

      for (const expectedPos of expectedPositions) {
        // Should have block building option
        expect(moves).toContainEqual({
          type: "build_block",
          workerId: 1,
          position: expectedPos,
          fromWorkerPosition: { x: 0, y: 0 },
          buildingLevel: 1
        });

        // Should have dome building option
        expect(moves).toContainEqual({
          type: "build_dome",
          workerId: 1,
          position: expectedPos,
          fromWorkerPosition: { x: 0, y: 0 },
          buildingType: "dome"
        });
      }
    });

    it("should generate moves for multiple workers", () => {
      // Place two workers for player 1
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      boardState.cells[3][3].worker = { playerId: 1, workerId: 2 };
      boardState.workers.set("1-2", { x: 3, y: 3, playerId: 1 });

      const moves = gameEngine.generateAvailablePlays(buildingContext);

      // Should have moves for both workers
      const worker1Moves = moves.filter(move => move.workerId === 1);
      const worker2Moves = moves.filter(move => move.workerId === 2);

      expect(worker1Moves.length).toBeGreaterThan(0);
      expect(worker2Moves.length).toBeGreaterThan(0);

      // Check that moves have correct fromWorkerPosition
      worker1Moves.forEach(move => {
        expect(move.fromWorkerPosition).toEqual({ x: 1, y: 1 });
      });

      worker2Moves.forEach(move => {
        expect(move.fromWorkerPosition).toEqual({ x: 3, y: 3 });
      });
    });

    it("should only generate moves for current player's workers", () => {
      // Place workers for both players
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      boardState.cells[3][3].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 3, y: 3, playerId: 2 });

      // Set current player to 1
      buildingContext.currentPlayerId = 1;

      const moves = gameEngine.generateAvailablePlays(buildingContext);

      // Should only have moves for player 1's worker
      moves.forEach(move => {
        expect(move.fromWorkerPosition).toEqual({ x: 1, y: 1 });
        expect(move.workerId).toBe(1);
      });

      // Should not have any moves from player 2's worker position
      expect(moves).not.toContainEqual(
        expect.objectContaining({ fromWorkerPosition: { x: 3, y: 3 } })
      );
    });
  });
});
