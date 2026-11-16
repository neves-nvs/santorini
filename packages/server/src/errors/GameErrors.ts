import type { ErrorCode, WireError } from "@santorini/shared";
import { GameId, GameRuleError, PlayerId, UserId } from "@santorini/engine";

export class GameError extends Error {
  public readonly httpStatus: number = 400;

  constructor(
    message: string,
    public userMessage: string = message,
    public readonly code: ErrorCode = "invalid_payload",
  ) {
    super(message);
    this.name = "GameError";
  }
}

export class GameNotFoundError extends GameError {
  public readonly httpStatus = 404;

  constructor(gameId: GameId) {
    super(`Game with ID ${gameId} not found`, "Game not found", "game_not_found");
  }
}

export class GameFullError extends GameError {
  public readonly httpStatus = 409;

  constructor(gameId: GameId, currentPlayers: number, maxPlayers: number) {
    super(`Game ${gameId} is full (${currentPlayers}/${maxPlayers})`, "Game is full", "game_full");
  }
}

export class PlayerAlreadyInGameError extends GameError {
  public readonly httpStatus = 409;

  constructor(gameId: GameId, userId: UserId) {
    super(`Player ${userId} is already in game ${gameId}`, "Already in game", "already_in_game");
  }
}

export class InvalidGameStateError extends GameError {
  public readonly httpStatus = 409;

  constructor(gameId: GameId, currentState: string, expectedState: string) {
    super(
      `Game ${gameId} is in state '${currentState}', expected '${expectedState}'`,
      "Invalid game state",
      "invalid_game_state",
    );
  }
}

export class NotPlayerTurnError extends GameError {
  public readonly httpStatus = 403;

  constructor(gameId: GameId, userId: UserId, currentPlayerId: PlayerId) {
    super(
      `It's not player ${userId}'s turn in game ${gameId} (current: ${currentPlayerId})`,
      "Not your turn",
      "not_your_turn",
    );
  }
}

export class PlayerNotInGameError extends GameError {
  public readonly httpStatus = 403;

  constructor(gameId: GameId, userId: UserId) {
    super(`Player ${userId} is not in game ${gameId}`, "Player not in game", "not_in_game");
  }
}

/** A failure the player caused or can fix, as opposed to a bug or an outage. */
export function isRefusal(error: unknown): boolean {
  return error instanceof GameError || error instanceof GameRuleError;
}

/**
 * What a client is told about a failure. Only a GameError carries a message for the player; anything else is
 * a bug or an outage whose details stay in the log.
 */
export function toWireError(error: unknown): WireError {
  if (error instanceof GameError) {
    return { code: error.code, message: error.userMessage };
  }
  if (error instanceof GameRuleError) {
    const code: ErrorCode = error.code;
    return { code, message: error.message };
  }
  return { code: "internal", message: "Something went wrong" };
}

/**
 * Get HTTP status code for an error
 */
export function getHttpStatus(error: unknown): number {
  if (error instanceof GameError) {
    return error.httpStatus;
  }
  if (error instanceof GameRuleError) {
    return error.code === "not_in_game" || error.code === "not_your_turn" ? 403 : 409;
  }
  return 500;
}
