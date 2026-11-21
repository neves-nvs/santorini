import { BoardCellSnapshot, BoardSnapshot, WorkerRef } from "../src/Board.ts";
import { BuildMove, MoveWorkerMove, PlaceWorkerMove } from "../src/Move.ts";
import { GameContext, GameState, applyMove, availableMoves, initialState, isTrapped } from "../src/rules.ts";
import { Seat, asSeat } from "../src/types.ts";

const TWO_PLAYERS: GameContext = { playerCount: 2 };
const [FIRST, SECOND] = [asSeat(0), asSeat(1)];

interface CellEdit {
  x: number;
  y: number;
  height?: number;
  hasDome?: boolean;
  worker?: WorkerRef;
}

function withCells(board: BoardSnapshot, ...edits: CellEdit[]): BoardSnapshot {
  return {
    cells: board.cells.map((column, x) =>
      column.map((cell, y): BoardCellSnapshot => {
        const edit = edits.find((candidate) => candidate.x === x && candidate.y === y);
        return edit ? { height: edit.height ?? 0, hasDome: edit.hasDome ?? false, worker: edit.worker ?? null } : cell;
      }),
    ),
  };
}

const worker = (seat: Seat, workerId: number): WorkerRef => ({ seat, workerId });
const cellAt = (state: GameState, x: number, y: number) => state.board.cells[x][y];

function applied(state: GameState, seat: Seat, move: Parameters<typeof applyMove>[3], context = TWO_PLAYERS) {
  const result = applyMove(state, context, seat, move);
  if (!result.ok) throw new Error(`Refused: ${result.error}`);
  return result;
}

const place = (state: GameState, seat: Seat, x: number, y: number, workerId: number, context = TWO_PLAYERS) =>
  applied(state, seat, new PlaceWorkerMove(seat, { x, y }, workerId), context).state;

function placedState(): GameState {
  let state = initialState();
  state = place(state, FIRST, 2, 2, 1);
  state = place(state, SECOND, 4, 4, 1);
  state = place(state, FIRST, 2, 3, 2);
  return place(state, SECOND, 4, 3, 2);
}

const deepFreeze = <T extends object>(value: T): T => {
  Object.values(value).forEach((inner) => typeof inner === "object" && inner !== null && deepFreeze(inner));
  return Object.freeze(value);
};

describe("initialState", () => {
  it("starts with an empty board, in the placing phase, with the first seat to move", () => {
    const state = initialState();

    expect(state.board.cells.flat()).toHaveLength(25);
    expect(state.board.cells.flat().every((cell) => cell.height === 0 && !cell.hasDome && cell.worker === null)).toBe(
      true,
    );
    expect(state).toMatchObject({
      phase: "placing",
      currentSeat: 0,
      turnNumber: 0,
      placingTurnsCompleted: 0,
      lastMovedWorker: null,
    });
  });
});

describe("the placing phase", () => {
  it("offers the seat to move every free cell for its first worker", () => {
    const moves = availableMoves(initialState());

    expect(moves).toHaveLength(25);
    expect(moves.every((move) => move instanceof PlaceWorkerMove && move.workerId === 1)).toBe(true);
  });

  it("offers the second worker once the first is placed, on the cells that are still free", () => {
    let state = place(initialState(), FIRST, 0, 0, 1);
    state = place(state, SECOND, 1, 1, 1);

    const moves = availableMoves(state);

    expect(moves).toHaveLength(23);
    expect(moves.every((move) => move instanceof PlaceWorkerMove && move.workerId === 2)).toBe(true);
  });

  it("alternates the seats and moves on to the moving phase once every worker is placed", () => {
    let state = initialState();
    state = place(state, FIRST, 2, 2, 1);
    expect(state).toMatchObject({ phase: "placing", currentSeat: 1 });
    state = place(state, SECOND, 4, 4, 1);
    expect(state).toMatchObject({ phase: "placing", currentSeat: 0 });
    state = place(state, FIRST, 2, 3, 2);
    state = place(state, SECOND, 4, 3, 2);

    expect(state).toMatchObject({ phase: "moving", currentSeat: 0, turnNumber: 1, placingTurnsCompleted: 4 });
  });

  it("gives every seat two workers in a game of three", () => {
    const three: GameContext = { playerCount: 3 };
    let state = initialState();
    [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [0, 4],
    ].forEach(([x, y], turn) => {
      state = place(state, asSeat(turn % 3), x, y, Math.floor(turn / 3) + 1, three);
    });

    expect(state).toMatchObject({ phase: "moving", currentSeat: 0, placingTurnsCompleted: 6 });
  });

  it("refuses a seat that is not the one to move", () => {
    const result = applyMove(initialState(), TWO_PLAYERS, SECOND, new PlaceWorkerMove(SECOND, { x: 0, y: 0 }, 1));

    expect(result).toMatchObject({ ok: false, error: "Not your turn", code: "not_your_turn" });
  });

  it("refuses a cell that is not on the board", () => {
    const outside = new PlaceWorkerMove(FIRST, { x: 5, y: 0 }, 1);

    expect(applyMove(initialState(), TWO_PLAYERS, FIRST, outside)).toMatchObject({ ok: false, error: "Invalid move" });
  });

  it("refuses a cell that is taken", () => {
    const state = place(initialState(), FIRST, 2, 2, 1);

    const result = applyMove(state, TWO_PLAYERS, SECOND, new PlaceWorkerMove(SECOND, { x: 2, y: 2 }, 1));

    expect(result).toMatchObject({ ok: false, code: "illegal_move" });
  });

  it("refuses a third worker for a seat", () => {
    const state: GameState = {
      ...initialState(),
      board: withCells(
        initialState().board,
        { x: 0, y: 0, worker: worker(FIRST, 1) },
        { x: 1, y: 0, worker: worker(FIRST, 2) },
      ),
    };

    const result = applyMove(state, TWO_PLAYERS, FIRST, new PlaceWorkerMove(FIRST, { x: 4, y: 4 }, 3));

    expect(result).toMatchObject({ ok: false, code: "illegal_move" });
    expect(availableMoves(state)).toHaveLength(0);
  });

  it("refuses a worker id that is not the next one", () => {
    const result = applyMove(initialState(), TWO_PLAYERS, FIRST, new PlaceWorkerMove(FIRST, { x: 0, y: 0 }, 2));

    expect(result).toMatchObject({ ok: false, code: "illegal_move" });
  });

  it("does not change the state it is given", () => {
    const state = deepFreeze(initialState());

    const next = place(state, FIRST, 0, 0, 1);

    expect(next).not.toBe(state);
    expect(cellAt(state, 0, 0).worker).toBeNull();
    expect(cellAt(next, 0, 0).worker).toEqual(worker(FIRST, 1));
  });
});

describe("the moving phase", () => {
  it("offers a seat only the adjacent free cells of its own workers, no more than one level up and never a dome", () => {
    const state: GameState = {
      ...initialState(),
      phase: "moving",
      board: withCells(
        initialState().board,
        { x: 0, y: 0, worker: worker(FIRST, 1) },
        { x: 4, y: 4, worker: worker(SECOND, 1) },
        { x: 1, y: 0, height: 2 },
        { x: 0, y: 1, hasDome: true },
        { x: 1, y: 1, height: 1 },
      ),
    };

    const targets = availableMoves(state).map((move) => `${move.position.x},${move.position.y}`);

    expect(targets).toEqual(["1,1"]);
  });

  it("moves the worker, remembers it, and hands the same seat the building phase", () => {
    const state = placedState();

    const next = applied(state, FIRST, new MoveWorkerMove(FIRST, { x: 1, y: 2 }, 1, { x: 2, y: 2 })).state;

    expect(next).toMatchObject({
      phase: "building",
      currentSeat: 0,
      lastMovedWorker: { workerId: 1, position: { x: 1, y: 2 } },
    });
    expect(cellAt(next, 2, 2).worker).toBeNull();
    expect(cellAt(next, 1, 2).worker).toEqual(worker(FIRST, 1));
  });

  it("refuses a worker that belongs to someone else, a cell that is too far, and a climb of two levels", () => {
    const state: GameState = {
      ...placedState(),
      board: withCells(
        placedState().board,
        { x: 2, y: 2, worker: worker(FIRST, 1) },
        { x: 4, y: 4, worker: worker(SECOND, 1) },
        { x: 2, y: 3, worker: worker(FIRST, 2) },
        { x: 4, y: 3, worker: worker(SECOND, 2) },
        { x: 1, y: 2, height: 2 },
      ),
    };

    const refused = [
      new MoveWorkerMove(FIRST, { x: 4, y: 2 }, 1, { x: 4, y: 4 }),
      new MoveWorkerMove(FIRST, { x: 2, y: 0 }, 1, { x: 2, y: 2 }),
      new MoveWorkerMove(FIRST, { x: 1, y: 2 }, 1, { x: 2, y: 2 }),
    ].map((move) => applyMove(state, TWO_PLAYERS, FIRST, move));

    expect(refused.every((result) => !result.ok)).toBe(true);
  });

  it("wins for the seat that climbs from level two to level three, and leaves the turn where it was", () => {
    const state: GameState = {
      ...initialState(),
      phase: "moving",
      board: withCells(
        initialState().board,
        { x: 1, y: 1, height: 2, worker: worker(FIRST, 1) },
        { x: 1, y: 2, height: 3 },
        { x: 4, y: 4, worker: worker(SECOND, 1) },
      ),
    };

    const result = applied(state, FIRST, new MoveWorkerMove(FIRST, { x: 1, y: 2 }, 1, { x: 1, y: 1 }));

    expect(result.winner).toBe(FIRST);
    expect(result.state).toMatchObject({ phase: "moving", currentSeat: 0 });
    expect(cellAt(result.state, 1, 2).worker).toEqual(worker(FIRST, 1));
  });

  it("does not report a winner for an ordinary move", () => {
    const result = applied(placedState(), FIRST, new MoveWorkerMove(FIRST, { x: 1, y: 2 }, 1, { x: 2, y: 2 }));

    expect(result.winner).toBeNull();
  });
});

describe("the building phase", () => {
  const afterMove = () =>
    applied(placedState(), FIRST, new MoveWorkerMove(FIRST, { x: 1, y: 2 }, 1, { x: 2, y: 2 })).state;

  it("offers builds only around the worker that just moved", () => {
    const targets = availableMoves(afterMove()).map((move) => move.position);

    expect(targets.length).toBeGreaterThan(0);
    expect(targets.every(({ x, y }) => Math.abs(x - 1) <= 1 && Math.abs(y - 2) <= 1)).toBe(true);
  });

  it("offers a block below level three and a dome on level three", () => {
    const state: GameState = {
      ...afterMove(),
      board: withCells(afterMove().board, { x: 0, y: 2, height: 3 }, { x: 0, y: 1, height: 1 }),
    };

    const byPosition = new Map(
      availableMoves(state).map((move) => [`${move.position.x},${move.position.y}`, move.type]),
    );

    expect(byPosition.get("0,2")).toBe("build_dome");
    expect(byPosition.get("0,1")).toBe("build_block");
  });

  it("builds, then passes the turn to the next seat in the moving phase", () => {
    const next = applied(afterMove(), FIRST, new BuildMove(FIRST, { x: 0, y: 2 }, "block")).state;

    expect(cellAt(next, 0, 2).height).toBe(1);
    expect(next).toMatchObject({ phase: "moving", currentSeat: 1, turnNumber: 2, lastMovedWorker: null });
  });

  it("builds a dome", () => {
    const state: GameState = { ...afterMove(), board: withCells(afterMove().board, { x: 0, y: 2, height: 3 }) };

    const next = applied(state, FIRST, new BuildMove(FIRST, { x: 0, y: 2 }, "dome")).state;

    expect(cellAt(next, 0, 2).hasDome).toBe(true);
  });

  it("refuses a build that is not next to the worker that just moved", () => {
    const result = applyMove(afterMove(), TWO_PLAYERS, FIRST, new BuildMove(FIRST, { x: 4, y: 0 }, "block"));

    expect(result).toMatchObject({ ok: false, code: "illegal_move" });
  });

  it("refuses a dome below level three and a block on level three", () => {
    const state: GameState = { ...afterMove(), board: withCells(afterMove().board, { x: 0, y: 2, height: 3 }) };

    expect(applyMove(afterMove(), TWO_PLAYERS, FIRST, new BuildMove(FIRST, { x: 0, y: 2 }, "dome")).ok).toBe(false);
    expect(applyMove(state, TWO_PLAYERS, FIRST, new BuildMove(FIRST, { x: 0, y: 2 }, "block")).ok).toBe(false);
  });
});

describe("isTrapped", () => {
  const cornered: GameState = {
    ...initialState(),
    phase: "moving",
    board: withCells(
      initialState().board,
      { x: 0, y: 0, worker: worker(FIRST, 1) },
      { x: 0, y: 1, hasDome: true },
      { x: 1, y: 0, hasDome: true },
      { x: 1, y: 1, hasDome: true },
      { x: 4, y: 4, worker: worker(SECOND, 1) },
    ),
  };

  it("is true in the moving phase when the seat to move has no move", () => {
    expect(isTrapped(cornered)).toBe(true);
  });

  it("is false while the seat to move has a move", () => {
    expect(isTrapped({ ...cornered, board: withCells(cornered.board, { x: 1, y: 1 }) })).toBe(false);
  });

  it("is false outside the moving phase", () => {
    expect(isTrapped({ ...cornered, phase: "building" })).toBe(false);
  });
});
