/**
 * Domain Types
 *
 * Core types used throughout the domain layer.
 * These should match the database types but are defined here for domain independence.
 */

export const GAME_STATUSES = ["waiting", "in-progress", "completed"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const GAME_PHASES = ["placing", "moving", "building"] as const;
export type GamePhase = (typeof GAME_PHASES)[number];

declare const brand: unique symbol;
type Brand<Value, Name extends string> = Value & { readonly [brand]: Name };

export type GameId = Brand<number, "GameId">;
export type UserId = Brand<number, "UserId">;
/** The seat a player holds in one game, counted from 0 in the order of joining. It is not the id of the user who plays it. */
export type Seat = Brand<number, "Seat">;

export const asGameId = (value: number): GameId => value as GameId;
export const asUserId = (value: number): UserId => value as UserId;
export const asSeat = (value: number): Seat => value as Seat;

export const WIN_REASONS = ["win_condition", "opponent_trapped"] as const;
export type WinReason = (typeof WIN_REASONS)[number];

/** How a finished game ended: the winner and the reason always come together. */
export interface GameOutcome {
  readonly winnerUserId: UserId;
  readonly reason: WinReason;
}

export const isWinReason = (value: string | null): value is WinReason => WIN_REASONS.some((reason) => reason === value);
