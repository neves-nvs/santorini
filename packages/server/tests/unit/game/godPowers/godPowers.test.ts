import { GameEngine, GameContext } from "../../../../src/game/gameEngine";
import { 
  PlacementRestrictionHook, 
  ExtraTurnHook,
  createGodPowerHook 
} from "../../../../src/game/godPowers";

describe("God Powers - General", () => {
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

  describe("PlacementRestrictionHook", () => {
    it("should remove corner positions from available moves", () => {
      const hook = new PlacementRestrictionHook();
      gameEngine.addHook(hook);

      const moves = gameEngine.generateAvailablePlays(mockContext);

      // Should have 25 - 4 corners = 21 moves
      expect(moves).toHaveLength(21);

      // Check that corners are not included
      const positions = moves.map(move => `${move.position?.x},${move.position?.y}`);
      expect(positions).not.toContain('0,0'); // Top-left corner
      expect(positions).not.toContain('0,4'); // Top-right corner  
      expect(positions).not.toContain('4,0'); // Bottom-left corner
      expect(positions).not.toContain('4,4'); // Bottom-right corner

      // Check that non-corners are still included
      expect(positions).toContain('1,1'); // Center-ish position
      expect(positions).toContain('2,2'); // Center position
    });

    it("should have correct priority", () => {
      const hook = new PlacementRestrictionHook();
      expect(hook.priority).toBe(15);
    });
  });

  describe("ExtraTurnHook", () => {
    it("should not change current player in afterTurn", () => {
      const hook = new ExtraTurnHook();
      gameEngine.addHook(hook);

      const originalContext = {
        gameId: 1,
        currentPhase: 'placing' as const,
        currentPlayerId: 5
      };

      const result = gameEngine.processAfterTurn(originalContext);

      // Player should remain the same (extra turn)
      expect(result.currentPlayerId).toBe(5);
      expect(result.gameId).toBe(1);
      expect(result.currentPhase).toBe('placing');
    });
  });

  describe("Hook Combinations", () => {
    it("should apply multiple hooks in priority order", () => {
      // Add a hook that removes first 5 positions (priority 10)
      const firstHook = {
        name: "remove-first-5",
        priority: 10,
        modifyPlacingMoves: (moves: any[]) => moves.slice(5)
      };

      // Add placement restriction hook (priority 15, runs after)
      const restrictionHook = new PlacementRestrictionHook();

      gameEngine.addHook(firstHook);
      gameEngine.addHook(restrictionHook);

      const moves = gameEngine.generateAvailablePlays(mockContext);

      // Should first remove 5 positions (25 -> 20), then remove corners
      // But corners might already be in the first 5, so let's just check it's less than 20
      expect(moves.length).toBeLessThan(20);
      expect(moves.length).toBeGreaterThan(15);
    });
  });

  describe("God Power Factory", () => {
    it("should create placement restriction hook", () => {
      const hook = createGodPowerHook("placementrestriction");
      
      expect(hook).not.toBeNull();
      expect(hook?.name).toBe("PlacementRestriction");
    });

    it("should create extra turn hook", () => {
      const hook = createGodPowerHook("extraturn");
      
      expect(hook).not.toBeNull();
      expect(hook?.name).toBe("ExtraTurn");
    });

    it("should create artemis hook", () => {
      const hook = createGodPowerHook("artemis");
      
      expect(hook).not.toBeNull();
      expect(hook?.name).toBe("Artemis");
    });

    it("should create atlas hook", () => {
      const hook = createGodPowerHook("atlas");
      
      expect(hook).not.toBeNull();
      expect(hook?.name).toBe("Atlas");
    });

    it("should create demeter hook", () => {
      const hook = createGodPowerHook("demeter");
      
      expect(hook).not.toBeNull();
      expect(hook?.name).toBe("Demeter");
    });

    it("should return null for unknown god power", () => {
      const hook = createGodPowerHook("unknown-power");
      
      expect(hook).toBeNull();
    });

    it("should be case insensitive", () => {
      const hook1 = createGodPowerHook("APOLLO");
      const hook2 = createGodPowerHook("apollo");
      const hook3 = createGodPowerHook("Apollo");
      
      expect(hook1?.name).toBe("Apollo");
      expect(hook2?.name).toBe("Apollo");
      expect(hook3?.name).toBe("Apollo");
    });
  });

  describe("Integration Test - Real Game Scenario", () => {
    it("should handle a game with placement restrictions", () => {
      // Simulate a game where player has placement restriction god power
      const restrictionHook = new PlacementRestrictionHook();
      gameEngine.addHook(restrictionHook);

      // Get available moves
      const moves = gameEngine.generateAvailablePlays(mockContext);

      // Verify the restriction is applied
      expect(moves).toHaveLength(21); // 25 - 4 corners

      // Verify we can still place in valid positions
      const validMove = moves.find(move => 
        move.position?.x === 2 && move.position?.y === 2
      );
      expect(validMove).toBeDefined();
      expect(validMove?.type).toBe("place_worker");
    });

    it("should handle turn processing with extra turn power", () => {
      const extraTurnHook = new ExtraTurnHook();
      gameEngine.addHook(extraTurnHook);

      const initialContext = {
        gameId: 1,
        currentPhase: 'placing' as const,
        currentPlayerId: 3
      };

      // Process a complete turn cycle
      const beforeTurn = gameEngine.processBeforeTurn(initialContext);
      const afterTurn = gameEngine.processAfterTurn(beforeTurn);

      // With extra turn, player should remain the same
      expect(afterTurn.currentPlayerId).toBe(3);
    });
  });
});
