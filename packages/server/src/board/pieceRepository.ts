import { Piece } from "../model";
import { db } from "../database";

export async function getPiecesByGame(gameId: number): Promise<Piece[]> {
  return await db
    .selectFrom("pieces")
    .select(["game_id", "id", "piece_id", "x", "y", "height", "type", "owner"])
    .where("game_id", "=", gameId)
    .execute();
}

export async function getBoardByGame(gameId: number) {
  const pieces = await getPiecesByGame(gameId);
  const board: Record<string, Piece[]> = {};

  for (const piece of pieces) {
    const positionKey = `${piece.x}-${piece.y}-${piece.height}`;
    if (!board[positionKey]) {
      board[positionKey] = [];
    }
    board[positionKey].push(piece);
  }

  return board;
}

export async function updatePiece(
  gameId: number,
  pieceId: number,
  pieceData: { x: number; y: number; height: number; type: string; owner: string },
) {
  await db
    .insertInto("pieces")
    .values({
      game_id: gameId,
      piece_id: pieceId,
      ...pieceData,
    })
    .onConflict((oc) => oc.columns(["piece_id"]).doUpdateSet(pieceData))
    .execute();
}

// TODO: This function needs to be refactored - it references 'this' incorrectly
// Commenting out for now as it's not used in the current implementation
/*
export async function updatePiece__(
  gameId: number,
  pieceId: number,
  newPosition: { x: number; y: number; height: number },
) {
  // This function needs proper implementation with correct context
  throw new Error("Function not implemented - needs refactoring");
}
*/

export async function movePiece(
  gameId: number,
  pieceId: number,
  newPosition: { x: number; y: number; height: number },
) {
  const piece = await db
    .selectFrom("pieces")
    .select(["piece_id", "x", "y", "height", "type", "owner"])
    .where("game_id", "=", gameId)
    .where("piece_id", "=", pieceId)
    .executeTakeFirstOrThrow();

  piece.x = newPosition.x;
  piece.y = newPosition.y;
  piece.height = newPosition.height;

  await updatePiece(gameId, pieceId, piece);
}

export function completeGame(gameId: number) {
  // Delete the in-memory state if necessary (for larger applications)
  // Optionally, perform any final database cleanup if needed

  console.log(`Game ${gameId} completed.`);
}

// TODO: This function needs to be refactored - it references 'this' incorrectly
// Commenting out for now as it's not used in the current implementation
/*
export async function saveGameState(gameId: number) {
  // This function needs proper implementation with correct context
  throw new Error("Function not implemented - needs refactoring");
}
*/
