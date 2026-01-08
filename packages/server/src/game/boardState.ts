// Board State Persistence for Santorini Server
// Handles database loading and saving of board state

import { getPiecesByGame } from "./gameRepository";
import { Piece } from "../model";
import { BoardState, createEmptyBoard } from "@santorini/game-engine";

/**
 * Load board state from database pieces
 */
export async function loadBoardState(gameId: number): Promise<BoardState> {
  const pieces = await getPiecesByGame(gameId);
  const boardState = createEmptyBoard();
  
  for (const piece of pieces) {
    const { x, y, height, type, owner } = piece;
    
    // Validate coordinates
    if (x < 0 || x >= 5 || y < 0 || y >= 5) {
      continue; // Skip invalid positions
    }
    
    if (type === "worker") {
      const playerId = parseInt(owner);
      const workerId = piece.piece_id;

      // Place worker on the board
      boardState.cells[x][y].worker = {
        playerId,
        workerId
      };

      // Track worker position
      boardState.workers.set(`${playerId}-${workerId}`, {
        x,
        y,
        playerId
      });
    } else if (type === "building") {
      // Set building height
      boardState.cells[x][y].height = height;
    } else if (type === "dome") {
      // Place dome
      boardState.cells[x][y].hasDome = true;
    }
  }
  
  return boardState;
}

/**
 * Save board state to database
 */
export async function saveBoardState(gameId: number, boardState: BoardState): Promise<void> {
  const { db } = require('../database');

  // Clear existing pieces for this game
  await db.deleteFrom('pieces').where('game_id', '=', gameId).execute();

  // Save all pieces (workers, buildings, domes)
  const pieces: any[] = [];
  let pieceIdCounter = 1;

  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      const cell = boardState.cells[x][y];

      // Save buildings (height > 0)
      if (cell.height > 0) {
        pieces.push({
          game_id: gameId,
          piece_id: pieceIdCounter++,
          x,
          y,
          height: cell.height,
          type: 'building',
          owner: '0' // Buildings don't have owners
        });
      }

      // Save domes
      if (cell.hasDome) {
        pieces.push({
          game_id: gameId,
          piece_id: pieceIdCounter++,
          x,
          y,
          height: cell.height,
          type: 'dome',
          owner: '0' // Domes don't have owners
        });
      }

      // Save workers
      if (cell.worker) {
        pieces.push({
          game_id: gameId,
          piece_id: cell.worker.workerId,
          x,
          y,
          height: cell.height,
          type: 'worker',
          owner: cell.worker.playerId.toString() // Save as string number
        });
      }
    }
  }

  // Insert all pieces
  if (pieces.length > 0) {
    await db.insertInto('pieces').values(pieces).execute();
  }
}
