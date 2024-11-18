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

export async function updatePiece__(
  gameId: number,
  pieceId: number,
  newPosition: { x: number; y: number; height: number },
) {
  const gameState = this.gameState.get(gameId);
  if (!gameState) throw new Error("Game state not loaded");

  const piece = gameState[pieceId];
  if (!piece) throw new Error("Piece not found");

  // Update the piece's position in memory
  piece.x = newPosition.x;
  piece.y = newPosition.y;
  piece.height = newPosition.height;

  // Update the database
  await this.db
    .insertInto("pieces")
    .values({
      gameid: gameId,
      pieceid: pieceId,
      x: newPosition.x,
      y: newPosition.y,
      height: newPosition.height,
      type: piece.type,
      owner: piece.owner,
    })
    .onConflict((oc) =>
      oc.columns(["pieceid"]).doUpdateSet({ x: newPosition.x, y: newPosition.y, height: newPosition.height }),
    )
    .execute();
}

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

export async function saveGameState(gameId: number) {
  const gameState = this.gameState.get(gameId);
  if (!gameState) throw new Error("Game state not loaded");

  // Iterate over all pieces in the gameState and save them
  for (const piece of Object.values(gameState)) {
    await db
      .insertInto("pieces")
      .values(piece)
      .onConflict((oc) =>
        oc
          .columns(["pieceid"])
          .doUpdateSet({ x: piece.x, y: piece.y, height: piece.height, type: piece.type, owner: piece.owner }),
      )
      .execute();
  }
}
