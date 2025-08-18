import { GameContext, Play } from "../../../../src/game/gameEngine";
import { ArtemisHook } from "../../../../src/game/godPowers/artemis";

describe("ArtemisHook", () => {
  let artemisHook: ArtemisHook;
  let movingContext: GameContext;

  beforeEach(() => {
    artemisHook = new ArtemisHook();
    movingContext = {
      gameId: 1,
      currentPhase: 'moving',
      currentPlayerId: 1
    };
  });

  it("should allow all moves on first move", () => {
    const mockMoves: Play[] = [
      { type: "move_worker", position: { x: 1, y: 1 } },
      { type: "move_worker", position: { x: 2, y: 2 } },
      { type: "move_worker", position: { x: 3, y: 3 } }
    ];

    const result = artemisHook.modifyMovingMoves(mockMoves, movingContext);

    expect(result).toEqual(mockMoves);
    expect(result).toHaveLength(3);
  });

  it("should exclude starting position on second move", () => {
    const mockMoves: Play[] = [
      { type: "move_worker", position: { x: 0, y: 0 } }, // Starting position
      { type: "move_worker", position: { x: 1, y: 1 } },
      { type: "move_worker", position: { x: 2, y: 2 } }
    ];

    // Simulate first move from (0,0) to (1,1)
    artemisHook.trackMove(1, 1, { x: 0, y: 0 }, { x: 1, y: 1 });

    const result = artemisHook.modifyMovingMoves(mockMoves, movingContext);

    // Should exclude the starting position (0,0)
    expect(result).toHaveLength(2);
    expect(result).not.toContainEqual({ type: "move_worker", position: { x: 0, y: 0 } });
    expect(result).toContainEqual({ type: "move_worker", position: { x: 1, y: 1 } });
    expect(result).toContainEqual({ type: "move_worker", position: { x: 2, y: 2 } });
  });

  it("should clear tracking on new turn", () => {
    // Set up tracking
    artemisHook.trackMove(1, 1, { x: 0, y: 0 }, { x: 1, y: 1 });

    // Start new turn
    artemisHook.beforeTurn(movingContext);

    const mockMoves: Play[] = [
      { type: "move_worker", position: { x: 0, y: 0 } },
      { type: "move_worker", position: { x: 1, y: 1 } }
    ];

    const result = artemisHook.modifyMovingMoves(mockMoves, movingContext);

    // Should allow all moves again (tracking cleared)
    expect(result).toHaveLength(2);
  });

  it("should handle multiple games independently", () => {
    const game1Context = { ...movingContext, gameId: 1 };
    const game2Context = { ...movingContext, gameId: 2 };

    const mockMoves: Play[] = [
      { type: "move_worker", position: { x: 0, y: 0 } },
      { type: "move_worker", position: { x: 1, y: 1 } }
    ];

    // Set up tracking for game 1 only
    artemisHook.trackMove(1, 1, { x: 0, y: 0 }, { x: 1, y: 1 });

    // Game 1 should have restriction
    const game1Result = artemisHook.modifyMovingMoves(mockMoves, game1Context);
    expect(game1Result).toHaveLength(1); // Starting position excluded

    // Game 2 should not have restriction
    const game2Result = artemisHook.modifyMovingMoves(mockMoves, game2Context);
    expect(game2Result).toHaveLength(2); // All moves allowed
  });

  it("should track move completion correctly", () => {
    // First move
    artemisHook.trackMove(1, 1, { x: 0, y: 0 }, { x: 1, y: 1 });

    const mockMoves: Play[] = [
      { type: "move_worker", position: { x: 0, y: 0 } },
      { type: "move_worker", position: { x: 2, y: 2 } }
    ];

    // Should exclude starting position
    let result = artemisHook.modifyMovingMoves(mockMoves, movingContext);
    expect(result).toHaveLength(1);

    // Second move (completes the turn)
    artemisHook.trackMove(1, 1, { x: 1, y: 1 }, { x: 2, y: 2 });

    // Now tracking should be cleared, so all moves allowed again
    result = artemisHook.modifyMovingMoves(mockMoves, movingContext);
    expect(result).toHaveLength(2);
  });
});
