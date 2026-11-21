import { BoardCellSnapshot, BoardSnapshot } from "./Board.ts";
import { RuleErrorCode } from "./errors.ts";
import { BuildMove, Move, MoveWorkerMove, PlaceWorkerMove, Position, isBoardCoordinate } from "./Move.ts";
import { GamePhase, Seat, asSeat } from "./types.ts";

const BOARD_SIZE = 5;
const WORKERS_PER_PLAYER = 2;

/** What the rules need to know besides the state of the game. */
export interface GameContext {
  readonly playerCount: number;
}

/** The game itself, as plain data: the same value can be stored, sent and handed back to the rules. */
export interface GameState {
  readonly board: BoardSnapshot;
  readonly phase: GamePhase;
  readonly currentSeat: Seat;
  readonly turnNumber: number;
  readonly placingTurnsCompleted: number;
  readonly lastMovedWorker: { readonly workerId: number; readonly position: Position } | null;
}

export type RuleMove = PlaceWorkerMove | MoveWorkerMove | BuildMove;

/** The state after a move, and the seat that won with it, or why the move is refused. */
export type MoveResult =
  | { readonly ok: true; readonly state: GameState; readonly winner: Seat | null }
  | { readonly ok: false; readonly error: string; readonly code: RuleErrorCode };

export function initialState(): GameState {
  const cells = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, (): BoardCellSnapshot => ({ height: 0, hasDome: false, worker: null })),
  );

  return {
    board: { cells },
    phase: "placing",
    currentSeat: asSeat(0),
    turnNumber: 0,
    placingTurnsCompleted: 0,
    lastMovedWorker: null,
  };
}

/** Every move the seat to move can make now. */
export function availableMoves(state: GameState): RuleMove[] {
  switch (state.phase) {
    case "placing":
      return placementMoves(state);
    case "moving":
      return movementMoves(state);
    case "building":
      return buildMoves(state);
  }
}

/** The seat to move has to move a worker and cannot. */
export function isTrapped(state: GameState): boolean {
  return state.phase === "moving" && availableMoves(state).length === 0;
}

/** Plays a move if it is one of the available moves of the seat to move, and refuses it otherwise. */
export function applyMove(state: GameState, context: GameContext, seat: Seat, move: Move): MoveResult {
  if (seat !== state.currentSeat) {
    return refused("Not your turn", "not_your_turn");
  }
  if (!move.isValid()) {
    return refused("Invalid move", "illegal_move");
  }
  const legal = availableMoves(state).find((candidate) => isSameMove(candidate, move));
  if (!legal) {
    return refused("Illegal move", "illegal_move");
  }

  if (legal instanceof PlaceWorkerMove) {
    const board = withCell(state.board, legal.position, (cell) => ({
      ...cell,
      worker: { seat, workerId: legal.workerId },
    }));
    const placingTurnsCompleted = state.placingTurnsCompleted + 1;
    const everyWorkerIsPlaced = placingTurnsCompleted >= context.playerCount * WORKERS_PER_PLAYER;

    return played({
      ...state,
      board,
      placingTurnsCompleted,
      phase: everyWorkerIsPlaced ? "moving" : "placing",
      currentSeat: everyWorkerIsPlaced ? asSeat(0) : nextSeat(seat, context),
      turnNumber: everyWorkerIsPlaced ? state.turnNumber + 1 : state.turnNumber,
    });
  }

  if (legal instanceof MoveWorkerMove) {
    const climbsToTheTop =
      cellAt(state.board, legal.fromPosition)?.height === 2 && cellAt(state.board, legal.position)?.height === 3;
    const left = withCell(state.board, legal.fromPosition, (cell) => ({ ...cell, worker: null }));
    const board = withCell(left, legal.position, (cell) => ({ ...cell, worker: { seat, workerId: legal.workerId } }));

    if (climbsToTheTop) {
      return { ok: true, state: { ...state, board }, winner: seat };
    }
    return played({
      ...state,
      board,
      phase: "building",
      lastMovedWorker: { workerId: legal.workerId, position: legal.position },
    });
  }

  const board = withCell(state.board, legal.position, (cell) =>
    legal.buildingType === "dome" ? { ...cell, hasDome: true } : { ...cell, height: cell.height + 1 },
  );
  return played({
    ...state,
    board,
    phase: "moving",
    currentSeat: nextSeat(seat, context),
    turnNumber: state.turnNumber + 1,
    lastMovedWorker: null,
  });
}

function placementMoves({ board, currentSeat }: GameState): PlaceWorkerMove[] {
  const placed = workersOf(board, currentSeat).length;
  if (placed >= WORKERS_PER_PLAYER) {
    return [];
  }

  return board.cells.flatMap((column, x) =>
    column.flatMap((cell, y) => (cell.worker === null ? [new PlaceWorkerMove(currentSeat, { x, y }, placed + 1)] : [])),
  );
}

function movementMoves({ board, currentSeat }: GameState): MoveWorkerMove[] {
  return workersOf(board, currentSeat).flatMap(({ workerId, position }) => {
    const climbLimit = (cellAt(board, position)?.height ?? 0) + 1;

    return neighbours(position).flatMap((target) => {
      const cell = cellAt(board, target);
      return isOpen(cell) && cell.height <= climbLimit
        ? [new MoveWorkerMove(currentSeat, target, workerId, position)]
        : [];
    });
  });
}

function buildMoves({ board, currentSeat, lastMovedWorker }: GameState): BuildMove[] {
  if (lastMovedWorker === null) {
    return [];
  }

  return neighbours(lastMovedWorker.position).flatMap((target) => {
    const cell = cellAt(board, target);
    if (!isOpen(cell)) {
      return [];
    }
    const buildingType = cell.height < 3 ? "block" : "dome";
    return [new BuildMove(currentSeat, target, buildingType, lastMovedWorker.workerId)];
  });
}

/** A build is named by where it goes: the worker is the one that just moved. */
function isSameMove(legal: RuleMove, move: Move): boolean {
  if (legal.type !== move.type || !isSamePosition(legal.position, move.position)) {
    return false;
  }
  if (legal instanceof PlaceWorkerMove && move instanceof PlaceWorkerMove) {
    return legal.workerId === move.workerId;
  }
  if (legal instanceof MoveWorkerMove && move instanceof MoveWorkerMove) {
    return legal.workerId === move.workerId && isSamePosition(legal.fromPosition, move.fromPosition);
  }
  return true;
}

const isSamePosition = (a: Position, b: Position) => a.x === b.x && a.y === b.y;

const cellAt = (board: BoardSnapshot, { x, y }: Position): BoardCellSnapshot | undefined =>
  isBoardCoordinate(x) && isBoardCoordinate(y) ? board.cells[x][y] : undefined;

const isOpen = (cell: BoardCellSnapshot | undefined): cell is BoardCellSnapshot =>
  cell !== undefined && cell.worker === null && !cell.hasDome;

function neighbours({ x, y }: Position): Position[] {
  return [-1, 0, 1].flatMap((dx) =>
    [-1, 0, 1].flatMap((dy) => (dx === 0 && dy === 0 ? [] : [{ x: x + dx, y: y + dy }])),
  );
}

function workersOf(board: BoardSnapshot, seat: Seat): Array<{ workerId: number; position: Position }> {
  return board.cells.flatMap((column, x) =>
    column.flatMap((cell, y) =>
      cell.worker?.seat === seat ? [{ workerId: cell.worker.workerId, position: { x, y } }] : [],
    ),
  );
}

function withCell(
  board: BoardSnapshot,
  position: Position,
  change: (cell: BoardCellSnapshot) => BoardCellSnapshot,
): BoardSnapshot {
  return {
    cells: board.cells.map((column, x) =>
      column.map((cell, y) => (x === position.x && y === position.y ? change(cell) : cell)),
    ),
  };
}

const nextSeat = (seat: Seat, context: GameContext) => asSeat((seat + 1) % context.playerCount);

const played = (state: GameState): MoveResult => ({ ok: true, state, winner: null });

const refused = (error: string, code: RuleErrorCode): MoveResult => ({ ok: false, error, code });
