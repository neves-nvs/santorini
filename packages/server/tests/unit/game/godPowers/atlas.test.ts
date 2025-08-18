import { GameContext, Play } from "../../../../src/game/gameEngine";
import { AtlasHook } from "../../../../src/game/godPowers/atlas";

describe("AtlasHook", () => {
  let atlasHook: AtlasHook;
  let buildingContext: GameContext;

  beforeEach(() => {
    atlasHook = new AtlasHook();
    buildingContext = {
      gameId: 1,
      currentPhase: 'building',
      currentPlayerId: 1
    };
  });

  it("should add dome options to all building positions", () => {
    const mockMoves: Play[] = [
      { type: "build_block", position: { x: 1, y: 1 } },
      { type: "build_block", position: { x: 2, y: 2 } }
    ];

    const result = atlasHook.modifyBuildingMoves(mockMoves, buildingContext);

    // Should have original moves plus dome options
    expect(result).toHaveLength(4);
    
    // Check original moves are preserved
    expect(result).toContainEqual({ type: "build_block", position: { x: 1, y: 1 } });
    expect(result).toContainEqual({ type: "build_block", position: { x: 2, y: 2 } });
    
    // Check dome options are added
    expect(result).toContainEqual({ 
      type: "build_dome", 
      position: { x: 1, y: 1 },
      buildingType: "dome"
    });
    expect(result).toContainEqual({ 
      type: "build_dome", 
      position: { x: 2, y: 2 },
      buildingType: "dome"
    });
  });

  it("should handle empty moves array", () => {
    const result = atlasHook.modifyBuildingMoves([], buildingContext);
    expect(result).toEqual([]);
  });

  it("should only add domes for build_block moves", () => {
    const mockMoves: Play[] = [
      { type: "build_block", position: { x: 1, y: 1 } },
      { type: "other_action", position: { x: 2, y: 2 } }
    ];

    const result = atlasHook.modifyBuildingMoves(mockMoves, buildingContext);

    // Should have 2 original + 1 dome (only for build_block)
    expect(result).toHaveLength(3);
    expect(result.filter(move => move.type === "build_dome")).toHaveLength(1);
  });

  it("should not modify moves without positions", () => {
    const mockMoves: Play[] = [
      { type: "build_block", position: { x: 1, y: 1 } },
      { type: "build_block" } // No position
    ];

    const result = atlasHook.modifyBuildingMoves(mockMoves, buildingContext);

    // Should have 2 original + 1 dome (only for move with position)
    expect(result).toHaveLength(3);
    expect(result.filter(move => move.type === "build_dome")).toHaveLength(1);
  });

  it("should preserve all original move properties", () => {
    const mockMoves: Play[] = [
      { 
        type: "build_block", 
        position: { x: 1, y: 1 },
        workerId: 5,
        customProperty: "test"
      }
    ];

    const result = atlasHook.modifyBuildingMoves(mockMoves, buildingContext);

    // Original move should be preserved exactly
    expect(result).toContainEqual({
      type: "build_block", 
      position: { x: 1, y: 1 },
      workerId: 5,
      customProperty: "test"
    });

    // Dome move should have correct properties
    expect(result).toContainEqual({
      type: "build_dome",
      position: { x: 1, y: 1 },
      buildingType: "dome"
    });
  });

  it("should work with multiple build_block moves", () => {
    const mockMoves: Play[] = [
      { type: "build_block", position: { x: 0, y: 0 } },
      { type: "build_block", position: { x: 1, y: 1 } },
      { type: "build_block", position: { x: 2, y: 2 } },
      { type: "build_block", position: { x: 3, y: 3 } },
      { type: "build_block", position: { x: 4, y: 4 } }
    ];

    const result = atlasHook.modifyBuildingMoves(mockMoves, buildingContext);

    // Should have 5 original + 5 dome options = 10 total
    expect(result).toHaveLength(10);
    expect(result.filter(move => move.type === "build_block")).toHaveLength(5);
    expect(result.filter(move => move.type === "build_dome")).toHaveLength(5);

    // Check that each position has both block and dome options
    for (let i = 0; i < 5; i++) {
      expect(result).toContainEqual({ type: "build_block", position: { x: i, y: i } });
      expect(result).toContainEqual({ 
        type: "build_dome", 
        position: { x: i, y: i },
        buildingType: "dome"
      });
    }
  });
});
