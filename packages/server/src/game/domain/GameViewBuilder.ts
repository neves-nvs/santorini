import { Board, WorkerRef } from './Board';
import { Game } from './Game';
import { Move } from './Move';
import { Player } from './Player';
import { VisibilityPolicy } from './VisibilityPolicy';

/**
 * View models for different types of game consumers
 */
export interface CellView {
  height: number;
  hasDome: boolean;
  worker: WorkerRef | null;
}

export interface BoardView {
  cells: CellView[][];
}

export interface PlayerView {
  id: number;
  userId: number;
  seat: number;
  status: string;
  isReady: boolean;
}

export interface PlayerGameView {
  gameId: number;
  status: string;
  phase: string | null;
  currentPlayerId: number | null;
  turnNumber: number;
  version: number;
  board: BoardView;
  players: PlayerView[];
  availableMoves?: Move[];
  winnerId?: number;
  winReason?: string;
  isCurrentPlayer: boolean;
}

export interface SpectatorGameView {
  gameId: number;
  status: string;
  phase: string | null;
  currentPlayerId: number | null;
  turnNumber: number;
  version: number;
  board: BoardView;
  players: PlayerView[];
  winnerId?: number | null;
  winReason?: string | null;
}

/**
 * Domain service that builds different views of the game state
 * Centralizes view generation logic with visibility policies
 */
export class GameViewBuilder {
  constructor(private visibilityPolicy: VisibilityPolicy = new VisibilityPolicy()) {}

  /**
   * Build a view for a specific player
   */
  buildForPlayer(game: Game, userId: number, availableMoves?: Move[]): PlayerGameView {
    const filteredGameState = this.visibilityPolicy.filterGameState(game, userId);
    const isCurrentPlayer = game.currentPlayerId === userId;

    return {
      gameId: game.id,
      status: filteredGameState.status,
      phase: filteredGameState.phase,
      currentPlayerId: filteredGameState.currentPlayerId,
      turnNumber: filteredGameState.turnNumber,
      version: filteredGameState.version,
      board: this.buildBoardView(filteredGameState.board),
      players: this.buildPlayersView(filteredGameState.players),
      availableMoves: isCurrentPlayer ? availableMoves : undefined,
      winnerId: filteredGameState.winnerId ?? undefined,
      winReason: filteredGameState.winReason ?? undefined,
      isCurrentPlayer
    };
  }

  /**
   * Build a view for spectators
   */
  buildForSpectator(game: Game): SpectatorGameView {
    return {
      gameId: game.id,
      status: game.status,
      phase: game.phase,
      currentPlayerId: game.currentPlayerId,
      turnNumber: game.turnNumber,
      version: game.version,
      board: this.buildBoardView(game.board),
      players: this.buildPlayersView(Array.from(game.players.values())),
      winnerId: game.winnerId,
      winReason: game.winReason
    };
  }

  /**
   * Build board representation for frontend
   */
  private buildBoardView(board: Board): BoardView {
    const cells: CellView[][] = [];
    for (let x = 0; x < 5; x++) {
      cells[x] = [];
      for (let y = 0; y < 5; y++) {
        const cell = board.getCell(x, y);
        cells[x][y] = {
          height: cell?.height || 0,
          hasDome: cell?.hasDome || false,
          worker: cell?.worker ? {
            playerId: cell.worker.playerId,
            workerId: cell.worker.workerId
          } : null
        };
      }
    }
    return { cells };
  }

  /**
   * Build players representation for frontend
   */
  private buildPlayersView(players: Player[]): PlayerView[] {
    return players.map(player => ({
      id: player.id,
      userId: player.userId,
      seat: player.seat,
      status: player.status,
      isReady: player.isReady
    }));
  }
}
