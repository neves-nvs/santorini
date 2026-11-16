import { GameNotFoundError, getHttpStatus, isRefusal, toWireError } from "@/errors/GameErrors.ts";
import { GameRuleError } from "@santorini/engine/errors";

describe("errors from the game rules", () => {
  it("tell the player what the rule said and keep its code", () => {
    const error = new GameRuleError("Not your turn", "not_your_turn");

    expect(toWireError(error)).toEqual({ code: "not_your_turn", message: "Not your turn" });
  });

  it("map to the HTTP status of their code", () => {
    expect(getHttpStatus(new GameRuleError("Not your turn", "not_your_turn"))).toBe(403);
    expect(getHttpStatus(new GameRuleError("Player not found in game", "not_in_game"))).toBe(403);
    expect(getHttpStatus(new GameRuleError("Game is full", "game_full"))).toBe(409);
    expect(getHttpStatus(new GameRuleError("Move failed", "illegal_move"))).toBe(409);
  });

  it("count as refusals, like the server's own errors, and a bug does not", () => {
    expect(isRefusal(new GameRuleError("Game is full", "game_full"))).toBe(true);
    expect(isRefusal(new GameNotFoundError(1))).toBe(true);
    expect(isRefusal(new Error("boom"))).toBe(false);
  });

  it("do not leak the details of an unexpected failure", () => {
    expect(toWireError(new Error("password is hunter2"))).toEqual({
      code: "internal",
      message: "Something went wrong",
    });
    expect(getHttpStatus(new Error("boom"))).toBe(500);
  });
});
