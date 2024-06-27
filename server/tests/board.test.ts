import { Board, PieceType, Position, Stack } from "../src/board/board";

describe("Board", () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  it("should initialize a 5x5 board", () => {
    const emptyPositions = board.getEmptyPositions();
    expect(emptyPositions.length).toBe(25); // 5x5 board, all positions should be empty
  });

  it("should return all empty positions", () => {
    const expectedPositions: Position[] = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        expectedPositions.push({ x, y });
      }
    }

    const emptyPositions = board.getEmptyPositions();
    expect(emptyPositions).toEqual(expectedPositions);
  });

  it("adding a piece should decrease the empty positions by 1", () => {
    ((board as any).board[2][2] as Stack).push(PieceType.BASE);

    const emptyPositions = board.getEmptyPositions();
    expect(emptyPositions.length).toBe(24); // One less empty position
    expect(emptyPositions).not.toContainEqual({ x: 2, y: 2 });
  });
});
