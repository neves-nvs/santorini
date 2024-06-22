import { Board, PieceType, Position, Stack } from "../board";

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

  it("should return an empty position after pushing a piece", () => {
    // This requires modifying the Stack class to be able to access a specific stack
    // For testing purposes, we'll assume we can access a specific stack to push a piece
    ((board as any).board[2][2] as Stack).push(PieceType.BASE);
    console.log(board.getEmptyPositions());
    console.log((board as any).board);

    const emptyPositions = board.getEmptyPositions();
    expect(emptyPositions.length).toBe(24); // One less empty position
    expect(emptyPositions).not.toContainEqual({ x: 2, y: 2 });
  });
});
