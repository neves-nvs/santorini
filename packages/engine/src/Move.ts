/**
 * Move Value Objects
 *
 * Represents different types of moves in Santorini.
 * Immutable value objects that encapsulate move data and validation.
 */

export interface Position {
  x: number;
  y: number;
}

/** What a client asks for. It is looser than a Move: `workerId` may be left out, and a build names no worker. */
export type MoveInput =
  | { type: "place_worker"; position: Position; workerId?: number }
  | { type: "move_worker"; position: Position; fromPosition: Position; workerId?: number }
  | { type: "build_block" | "build_dome"; position: Position };

const BOARD_SIZE = 5;

export function isBoardCoordinate(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < BOARD_SIZE;
}

export function isBoardPosition(position: unknown): position is Position {
  if (typeof position !== "object" || position === null) return false;
  const { x, y } = position as Record<string, unknown>;
  return isBoardCoordinate(x) && isBoardCoordinate(y);
}

export type MoveType = "place_worker" | "move_worker" | "build_block" | "build_dome";

export abstract class Move {
  constructor(
    public readonly type: MoveType,
    public readonly playerId: number,
    public readonly position: Position,
  ) {}

  abstract isValid(): boolean;
}

export class PlaceWorkerMove extends Move {
  constructor(
    playerId: number,
    position: Position,
    public readonly workerId: number,
  ) {
    super("place_worker", playerId, position);
  }

  isValid(): boolean {
    return isBoardPosition(this.position) && this.workerId > 0;
  }
}

export class MoveWorkerMove extends Move {
  constructor(
    playerId: number,
    position: Position,
    public readonly workerId: number,
    public readonly fromPosition: Position,
  ) {
    super("move_worker", playerId, position);
  }

  isValid(): boolean {
    return isBoardPosition(this.position) && isBoardPosition(this.fromPosition) && this.workerId > 0;
  }
}

export class BuildMove extends Move {
  constructor(
    playerId: number,
    position: Position,
    public readonly buildingType: "block" | "dome",
    public readonly workerId: number = 0,
  ) {
    super(buildingType === "block" ? "build_block" : "build_dome", playerId, position);
  }

  isValid(): boolean {
    return isBoardPosition(this.position);
  }
}

// Factory function to create moves from raw data
// playerId is provided separately (from authenticated user)
export function createMove(playerId: number, moveData: MoveInput): Move {
  switch (moveData.type) {
    case "place_worker":
      return new PlaceWorkerMove(playerId, moveData.position, moveData.workerId ?? 0);

    case "move_worker":
      return new MoveWorkerMove(playerId, moveData.position, moveData.workerId ?? 0, moveData.fromPosition);

    case "build_block":
    case "build_dome":
      return new BuildMove(playerId, moveData.position, moveData.type === "build_block" ? "block" : "dome");

    default:
      throw new Error(`Unknown move type: ${(moveData as { type: string }).type}`);
  }
}
