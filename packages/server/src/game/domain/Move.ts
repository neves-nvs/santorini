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

export type MoveType = 'place_worker' | 'move_worker' | 'build_block' | 'build_dome';

export abstract class Move {
  constructor(
    public readonly type: MoveType,
    public readonly playerId: number,
    public readonly position: Position
  ) {}

  abstract isValid(): boolean;
}

export class PlaceWorkerMove extends Move {
  constructor(
    playerId: number,
    position: Position,
    public readonly workerId: number
  ) {
    super('place_worker', playerId, position);
  }

  isValid(): boolean {
    return this.position.x >= 0 && this.position.x < 5 &&
           this.position.y >= 0 && this.position.y < 5 &&
           this.workerId > 0;
  }
}

export class MoveWorkerMove extends Move {
  constructor(
    playerId: number,
    position: Position,
    public readonly workerId: number,
    public readonly fromPosition: Position
  ) {
    super('move_worker', playerId, position);
  }

  isValid(): boolean {
    return this.position.x >= 0 && this.position.x < 5 &&
           this.position.y >= 0 && this.position.y < 5 &&
           this.fromPosition.x >= 0 && this.fromPosition.x < 5 &&
           this.fromPosition.y >= 0 && this.fromPosition.y < 5 &&
           this.workerId > 0;
  }
}

export class BuildMove extends Move {
  constructor(
    playerId: number,
    position: Position,
    public readonly buildingType: 'block' | 'dome',
    public readonly workerId: number = 0,
    public readonly buildingLevel?: number
  ) {
    super(buildingType === 'block' ? 'build_block' : 'build_dome', playerId, position);
  }

  isValid(): boolean {
    return this.position.x >= 0 && this.position.x < 5 &&
           this.position.y >= 0 && this.position.y < 5;
  }
}

// Command types for incoming move requests (from client, without playerId)
export interface PlaceWorkerCommand {
  type: 'place_worker';
  position: Position;
  workerId?: number;
}

export interface MoveWorkerCommand {
  type: 'move_worker';
  position: Position;
  workerId?: number;
  fromPosition: Position;
}

export interface BuildCommand {
  type: 'build_block' | 'build_dome';
  position: Position;
  buildingLevel?: number;
}

export type MoveCommand = PlaceWorkerCommand | MoveWorkerCommand | BuildCommand;

// Factory function to create moves from raw data
// playerId is provided separately (from authenticated user)
export function createMove(playerId: number, moveData: MoveCommand): Move {
  switch (moveData.type) {
    case 'place_worker':
      return new PlaceWorkerMove(
        playerId,
        moveData.position,
        moveData.workerId ?? 0
      );

    case 'move_worker':
      return new MoveWorkerMove(
        playerId,
        moveData.position,
        moveData.workerId ?? 0,
        moveData.fromPosition
      );

    case 'build_block':
    case 'build_dome':
      return new BuildMove(
        playerId,
        moveData.position,
        moveData.type === 'build_block' ? 'block' : 'dome',
        moveData.buildingLevel
      );

    default:
      throw new Error(`Unknown move type: ${(moveData as { type: string }).type}`);
  }
}
