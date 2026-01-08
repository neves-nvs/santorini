import {
  generatePlacingPhaseAvailablePlays,
  generateMovingPhaseAvailablePlays,
  generateBuildingPhaseAvailablePlays,
  checkWinningMove,
  checkGameState
} from "../../../src/game/gameController";
import { createEmptyBoard } from "@santorini/game-engine";

describe("Game Flow Integration", () => {
  describe("Placing to Moving Phase Transition", () => {
    it("should demonstrate complete game flow from placing to moving", async () => {
      const gameId = 1;
      
      // === PLACING PHASE ===
      
      // Start with empty board - should have 25 available positions
      let boardState = createEmptyBoard();
      let placingMoves = await generatePlacingPhaseAvailablePlays(gameId, boardState);
      expect(placingMoves).toHaveLength(25);
      
      // Player 1 places first worker at (1,1)
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });
      
      // Now should have 24 available positions
      placingMoves = await generatePlacingPhaseAvailablePlays(gameId, boardState);
      expect(placingMoves).toHaveLength(24);
      expect(placingMoves).not.toContainEqual(
        expect.objectContaining({ position: { x: 1, y: 1 } })
      );
      
      // Player 2 places first worker at (3,3)
      boardState.cells[3][3].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 3, y: 3, playerId: 2 });
      
      // Player 1 places second worker at (1,3)
      boardState.cells[1][3].worker = { playerId: 1, workerId: 2 };
      boardState.workers.set("1-2", { x: 1, y: 3, playerId: 1 });
      
      // Player 2 places second worker at (3,1)
      boardState.cells[3][1].worker = { playerId: 2, workerId: 2 };
      boardState.workers.set("2-2", { x: 3, y: 1, playerId: 2 });
      
      // Now should have 21 available positions (25 - 4 workers)
      placingMoves = await generatePlacingPhaseAvailablePlays(gameId, boardState);
      expect(placingMoves).toHaveLength(21);
      
      // === MOVING PHASE ===
      
      // Player 1's turn - should be able to move both workers
      const player1Moves = await generateMovingPhaseAvailablePlays(gameId, 1, boardState);

      // Worker 1 at (1,1) has 8 adjacent positions, none blocked by workers
      // Worker 2 at (1,3) has 8 adjacent positions, none blocked by workers
      // Total should be 16 moves
      expect(player1Moves).toHaveLength(16);
      
      // Check that moves are for the correct player
      player1Moves.forEach(move => {
        expect(move.type).toBe("move_worker");
        expect([1, 2]).toContain(move.workerId); // Player 1's workers
        expect([{ x: 1, y: 1 }, { x: 1, y: 3 }]).toContainEqual(move.fromPosition);
      });
      
      // Player 2's turn - should be able to move both workers
      const player2Moves = await generateMovingPhaseAvailablePlays(gameId, 2, boardState);
      expect(player2Moves).toHaveLength(16); // Same logic as player 1
      
      // Check that moves are for the correct player
      player2Moves.forEach(move => {
        expect(move.type).toBe("move_worker");
        expect([1, 2]).toContain(move.workerId); // Player 2's workers (workerId is relative to player)
        expect([{ x: 3, y: 3 }, { x: 3, y: 1 }]).toContainEqual(move.fromPosition);
      });
    });

    it("should handle height restrictions in moving phase", async () => {
      const gameId = 1;
      const boardState = createEmptyBoard();
      
      // Place worker at ground level
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });
      
      // Create height variations around the worker
      boardState.cells[1][1].height = 1; // Can move up 1 level
      boardState.cells[1][2].height = 2; // Can't move up 2 levels
      boardState.cells[2][1].height = 0; // Can move to same level
      
      const moves = await generateMovingPhaseAvailablePlays(gameId, 1, boardState);
      
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

    it("should handle blocked positions in moving phase", async () => {
      const gameId = 1;
      const boardState = createEmptyBoard();
      
      // Place worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });
      
      // Block some adjacent positions
      boardState.cells[1][1].worker = { playerId: 2, workerId: 1 }; // Occupied
      boardState.cells[1][2].hasDome = true; // Domed
      
      const moves = await generateMovingPhaseAvailablePlays(gameId, 1, boardState);
      
      // Should have 6 moves (8 - 1 occupied - 1 domed)
      expect(moves).toHaveLength(6);
      
      // Should not include occupied position
      expect(moves).not.toContainEqual(
        expect.objectContaining({ position: { x: 1, y: 1 } })
      );
      
      // Should not include domed position
      expect(moves).not.toContainEqual(
        expect.objectContaining({ position: { x: 1, y: 2 } })
      );
    });

    it("should show progression from placing phase completion to moving phase", async () => {
      const gameId = 1;
      const boardState = createEmptyBoard();
      
      // Simulate complete placing phase (4 workers placed)
      boardState.cells[0][0].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 0, y: 0, playerId: 1 });
      
      boardState.cells[0][4].worker = { playerId: 1, workerId: 2 };
      boardState.workers.set("1-2", { x: 0, y: 4, playerId: 1 });
      
      boardState.cells[4][0].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 4, y: 0, playerId: 2 });
      
      boardState.cells[4][4].worker = { playerId: 2, workerId: 2 };
      boardState.workers.set("2-2", { x: 4, y: 4, playerId: 2 });
      
      // Placing phase should show 21 available positions
      const placingMoves = await generatePlacingPhaseAvailablePlays(gameId, boardState);
      expect(placingMoves).toHaveLength(21);
      
      // Moving phase should work for both players
      const player1Moves = await generateMovingPhaseAvailablePlays(gameId, 1, boardState);
      const player2Moves = await generateMovingPhaseAvailablePlays(gameId, 2, boardState);
      
      // Each player should have moves available
      expect(player1Moves.length).toBeGreaterThan(0);
      expect(player2Moves.length).toBeGreaterThan(0);
      
      // Moves should be from corner positions (limited by board edges)
      expect(player1Moves.every(move => 
        [{ x: 0, y: 0 }, { x: 0, y: 4 }].some(pos => 
          pos.x === move.fromPosition?.x && pos.y === move.fromPosition?.y
        )
      )).toBe(true);
      
      expect(player2Moves.every(move => 
        [{ x: 4, y: 0 }, { x: 4, y: 4 }].some(pos => 
          pos.x === move.fromPosition?.x && pos.y === move.fromPosition?.y
        )
      )).toBe(true);
    });

    it("should demonstrate complete game flow: placing → moving → building", async () => {
      const gameId = 1;
      const boardState = createEmptyBoard();

      // === PLACING PHASE ===
      // Place workers for both players
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      boardState.cells[1][3].worker = { playerId: 1, workerId: 2 };
      boardState.workers.set("1-2", { x: 1, y: 3, playerId: 1 });

      boardState.cells[3][1].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 3, y: 1, playerId: 2 });

      boardState.cells[3][3].worker = { playerId: 2, workerId: 2 };
      boardState.workers.set("2-2", { x: 3, y: 3, playerId: 2 });

      // Verify placing phase shows remaining positions
      const placingMoves = await generatePlacingPhaseAvailablePlays(gameId, boardState);
      expect(placingMoves).toHaveLength(21); // 25 - 4 workers

      // === MOVING PHASE ===
      // Player 1 can move both workers
      const player1Moves = await generateMovingPhaseAvailablePlays(gameId, 1, boardState);
      expect(player1Moves.length).toBeGreaterThan(0);

      // Simulate Player 1 moving worker from (1,1) to (2,1)
      boardState.cells[1][1].worker = undefined; // Remove from old position
      boardState.cells[2][1].worker = { playerId: 1, workerId: 1 }; // Place at new position
      boardState.workers.set("1-1", { x: 2, y: 1, playerId: 1 }); // Update tracking

      // === BUILDING PHASE ===
      // Player 1 can now build with the moved worker
      const buildingMoves = await generateBuildingPhaseAvailablePlays(gameId, 1, boardState);
      expect(buildingMoves.length).toBeGreaterThan(0);

      // Check that building moves include both workers
      const worker1BuildMoves = buildingMoves.filter(move => move.workerId === 1);
      const worker2BuildMoves = buildingMoves.filter(move => move.workerId === 2);

      expect(worker1BuildMoves.length).toBeGreaterThan(0);
      expect(worker2BuildMoves.length).toBeGreaterThan(0);

      // Worker 1 should build from new position (2,1)
      worker1BuildMoves.forEach(move => {
        expect(move.fromWorkerPosition).toEqual({ x: 2, y: 1 });
      });

      // Worker 2 should build from original position (1,3)
      worker2BuildMoves.forEach(move => {
        expect(move.fromWorkerPosition).toEqual({ x: 1, y: 3 });
      });

      // Simulate building a block at (2,0) - adjacent to moved worker
      boardState.cells[2][0].height = 1;

      // === NEXT TURN CYCLE ===
      // Player 2's turn - should be able to move and build
      const player2Moves = await generateMovingPhaseAvailablePlays(gameId, 2, boardState);
      const player2Builds = await generateBuildingPhaseAvailablePlays(gameId, 2, boardState);

      expect(player2Moves.length).toBeGreaterThan(0);
      expect(player2Builds.length).toBeGreaterThan(0);

      // Player 2's moves should be from their worker positions
      player2Moves.forEach(move => {
        expect([{ x: 3, y: 1 }, { x: 3, y: 3 }]).toContainEqual(move.fromPosition);
      });
    });

    it("should demonstrate complete game with win condition", async () => {
      const gameId = 1;
      const boardState = createEmptyBoard();

      // === SETUP: Build a tower to level 2 ===
      // Place workers
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      boardState.cells[0][0].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 0, y: 0, playerId: 2 });

      // Build a tower at (1,1): ground -> level 1 -> level 2
      boardState.cells[1][1].height = 2;

      // Build level 3 at (1,2) - the winning destination
      boardState.cells[1][2].height = 3;

      // === MOVE PHASE: Move worker to level 2 ===
      // Move Player 1's worker from (2,2) to (1,1) - now on level 2
      boardState.cells[2][2].worker = undefined;
      boardState.cells[1][1].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 1, playerId: 1 });

      // Check game state - should not be won yet
      let gameState = await checkGameState(gameId, boardState);
      expect(gameState.gameOver).toBe(false);

      // === WINNING MOVE: Level 2 to Level 3 ===
      // Check if move from (1,1) to (1,2) would be winning
      const isWinning = await checkWinningMove(gameId, 1, 1, 1, 2, boardState);
      expect(isWinning).toBe(true);

      // Execute the winning move
      boardState.cells[1][1].worker = undefined;
      boardState.cells[1][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 1, y: 2, playerId: 1 });

      // Check game state - should be won now
      gameState = await checkGameState(gameId, boardState);
      expect(gameState).toEqual({
        gameOver: true,
        winner: 1,
        reason: 'win_condition'
      });
    });

    it("should demonstrate game ending by blocking opponent", async () => {
      const gameId = 1;
      const boardState = createEmptyBoard();

      // Place Player 1's worker at center
      boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
      boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

      // Place Player 2's worker at corner (will be blocked)
      boardState.cells[0][0].worker = { playerId: 2, workerId: 1 };
      boardState.workers.set("2-1", { x: 0, y: 0, playerId: 2 });

      // Block Player 2's worker by placing domes around it
      boardState.cells[0][1].hasDome = true;
      boardState.cells[1][0].hasDome = true;
      boardState.cells[1][1].hasDome = true;

      // Check game state - Player 2 should be blocked, Player 1 wins
      const gameState = await checkGameState(gameId, boardState);
      expect(gameState).toEqual({
        gameOver: true,
        winner: 1, // Player 1 wins because Player 2 is blocked
        reason: 'opponent_blocked'
      });
    });
  });
});
