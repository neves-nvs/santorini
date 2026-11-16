/**
 * Domain Types
 *
 * Core types used throughout the domain layer.
 * These should match the database types but are defined here for domain independence.
 */

export type GameStatus = "waiting" | "in-progress" | "completed";
export type GamePhase = "placing" | "moving" | "building";

declare const brand: unique symbol;
type Brand<Value, Name extends string> = Value & { readonly [brand]: Name };

export type GameId = Brand<number, "GameId">;
export type UserId = Brand<number, "UserId">;
/** The seat of a player inside one game, which is not the id of the user who plays it. */
export type PlayerId = Brand<number, "PlayerId">;

export const asGameId = (value: number): GameId => value as GameId;
export const asUserId = (value: number): UserId => value as UserId;
export const asPlayerId = (value: number): PlayerId => value as PlayerId;

export interface DomainError extends Error {
  readonly code: string;
  readonly userMessage: string;
}

export class InvalidMoveError extends Error implements DomainError {
  readonly code = "INVALID_MOVE";
  readonly userMessage: string;

  constructor(message: string, userMessage?: string) {
    super(message);
    this.name = "InvalidMoveError";
    this.userMessage = userMessage || "Invalid move";
  }
}

export class GameNotInProgressError extends Error implements DomainError {
  readonly code = "GAME_NOT_IN_PROGRESS";
  readonly userMessage = "Game is not in progress";

  constructor() {
    super("Game is not in progress");
    this.name = "GameNotInProgressError";
  }
}

export class NotYourTurnError extends Error implements DomainError {
  readonly code = "NOT_YOUR_TURN";
  readonly userMessage = "It is not your turn";

  constructor() {
    super("It is not your turn");
    this.name = "NotYourTurnError";
  }
}

export class GameFullError extends Error implements DomainError {
  readonly code = "GAME_FULL";
  readonly userMessage = "Game is full";

  constructor() {
    super("Game is full");
    this.name = "GameFullError";
  }
}

export class PlayerNotInGameError extends Error implements DomainError {
  readonly code = "PLAYER_NOT_IN_GAME";
  readonly userMessage = "Player is not in this game";

  constructor() {
    super("Player is not in this game");
    this.name = "PlayerNotInGameError";
  }
}
