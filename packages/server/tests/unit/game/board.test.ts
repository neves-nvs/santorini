import { Board, PieceType, Position } from "../../../src/board/board";
import { server } from "../../../src/main";

describe("Board", () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  afterAll(() => {
    server.close();
  });

  it("should initialize a 5x5 board", () => {
    const emptyPositions = board.getEmptyPositions();
    expect(emptyPositions.length).toBe(5 * 5);
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
    board.getSpaces()[2][2].push(PieceType.BASE);

    const emptyPositions = board.getEmptyPositions();
    expect(emptyPositions.length).toBe(5 * 5 - 1);
    expect(emptyPositions).not.toContainEqual({ x: 2, y: 2 });
  });
});
