import { GameContext, Play } from "../../../../src/game/gameEngine";
import { DemeterHook } from "../../../../src/game/godPowers/demeter";

describe("DemeterHook", () => {
  let demeterHook: DemeterHook;
  let buildingContext: GameContext;

  beforeEach(() => {
    demeterHook = new DemeterHook();
    buildingContext = {
      gameId: 1,
      currentPhase: 'building',
      currentPlayerId: 1
    };
  });

  it("should allow all moves on first build", () => {
    const mockMoves: Play[] = [
      { type: "build_block", position: { x: 1, y: 1 } },
      { type: "build_block", position: { x: 2, y: 2 } },
      { type: "build_block", position: { x: 3, y: 3 } }
    ];

    const result = demeterHook.modifyBuildingMoves(mockMoves, buildingContext);

    expect(result).toEqual(mockMoves);
    expect(result).toHaveLength(3);
  });

  it("should exclude first build position on second build", () => {
    const mockMoves: Play[] = [
      { type: "build_block", position: { x: 1, y: 1 } }, // First build position
      { type: "build_block", position: { x: 2, y: 2 } },
      { type: "build_block", position: { x: 3, y: 3 } }
    ];

    // Simulate first build at (1,1)
    demeterHook.trackBuild(1, { x: 1, y: 1 });

    const result = demeterHook.modifyBuildingMoves(mockMoves, buildingContext);

    // Should exclude the first build position
    expect(result).toHaveLength(2);
    expect(result).not.toContainEqual({ type: "build_block", position: { x: 1, y: 1 } });
    expect(result).toContainEqual({ type: "build_block", position: { x: 2, y: 2 } });
    expect(result).toContainEqual({ type: "build_block", position: { x: 3, y: 3 } });
  });

  it("should clear tracking on new turn", () => {
    // Set up tracking
    demeterHook.trackBuild(1, { x: 1, y: 1 });

    // Start new turn
    demeterHook.beforeTurn(buildingContext);

    const mockMoves: Play[] = [
      { type: "build_block", position: { x: 1, y: 1 } },
      { type: "build_block", position: { x: 2, y: 2 } }
    ];

    const result = demeterHook.modifyBuildingMoves(mockMoves, buildingContext);

    // Should allow all moves again (tracking cleared)
    expect(result).toHaveLength(2);
  });

  it("should handle multiple games independently", () => {
    const game1Context = { ...buildingContext, gameId: 1 };
    const game2Context = { ...buildingContext, gameId: 2 };

    const mockMoves: Play[] = [
      { type: "build_block", position: { x: 1, y: 1 } },
      { type: "build_block", position: { x: 2, y: 2 } }
    ];

    // Set up tracking for game 1 only
    demeterHook.trackBuild(1, { x: 1, y: 1 });

    // Game 1 should have restriction
    const game1Result = demeterHook.modifyBuildingMoves(mockMoves, game1Context);
    expect(game1Result).toHaveLength(1); // First build position excluded

    // Game 2 should not have restriction
    const game2Result = demeterHook.modifyBuildingMoves(mockMoves, game2Context);
    expect(game2Result).toHaveLength(2); // All moves allowed
  });

  it("should track build completion correctly", () => {
    // First build
    demeterHook.trackBuild(1, { x: 1, y: 1 });

    const mockMoves: Play[] = [
      { type: "build_block", position: { x: 1, y: 1 } },
      { type: "build_block", position: { x: 2, y: 2 } }
    ];

    // Should exclude first build position
    let result = demeterHook.modifyBuildingMoves(mockMoves, buildingContext);
    expect(result).toHaveLength(1);

    // Second build (completes the turn)
    demeterHook.trackBuild(1, { x: 2, y: 2 });

    // Now tracking should be cleared, so all moves allowed again
    result = demeterHook.modifyBuildingMoves(mockMoves, buildingContext);
    expect(result).toHaveLength(2);
  });

  it("should handle moves without positions", () => {
    const mockMoves: Play[] = [
      { type: "build_block", position: { x: 1, y: 1 } },
      { type: "build_block" }, // No position
      { type: "build_block", position: { x: 2, y: 2 } }
    ];

    // Set up tracking
    demeterHook.trackBuild(1, { x: 1, y: 1 });

    const result = demeterHook.modifyBuildingMoves(mockMoves, buildingContext);

    // Should exclude first build position but keep move without position
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ type: "build_block" });
    expect(result).toContainEqual({ type: "build_block", position: { x: 2, y: 2 } });
  });

  it("should preserve all move properties when filtering", () => {
    const mockMoves: Play[] = [
      { 
        type: "build_block", 
        position: { x: 1, y: 1 },
        workerId: 5,
        customProperty: "excluded"
      },
      { 
        type: "build_block", 
        position: { x: 2, y: 2 },
        workerId: 5,
        customProperty: "included"
      }
    ];

    // Set up tracking to exclude first move
    demeterHook.trackBuild(1, { x: 1, y: 1 });

    const result = demeterHook.modifyBuildingMoves(mockMoves, buildingContext);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "build_block", 
      position: { x: 2, y: 2 },
      workerId: 5,
      customProperty: "included"
    });
  });
});
