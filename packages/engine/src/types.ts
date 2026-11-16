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
