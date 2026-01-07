import {
  BoardView,
  CellView,
  GamePhase,
  GameStatus,
  PlayerGameView,
  PlayerView,
  Move as SharedMove,
  SpectatorGameView
} from '../../../../shared/src/game-types';
import { BuildMove, Move, MoveWorkerMove, PlaceWorkerMove } from './Move';
import { Board } from './Board';
import { Game } from './Game';
import { Player } from './Player';
import { VisibilityPolicy } from './VisibilityPolicy';

// Re-export for backwards compatibility
export type { BoardView, CellView, PlayerGameView, PlayerView, SpectatorGameView };

/**
 * Convert domain Move to shared Move format
 */
function toSharedMove(move: Move): SharedMove {
  if (move instanceof PlaceWorkerMove) {
    return {
      type: 'place_worker',
      workerId: move.workerId,
      position: move.position
    };
  } else if (move instanceof MoveWorkerMove) {
    return {
      type: 'move_worker',
      workerId: move.workerId,
      fromPosition: move.fromPosition,
      position: move.position
    };
  } else if (move instanceof BuildMove) {
    const buildType = move.type as 'build_block' | 'build_dome';
    return {
      type: buildType,
      workerId: 0, // BuildMove doesn't have workerId in current domain
      position: move.position
    };
  }
  // Fallback - shouldn't reach here
  return {
    type: 'build_block',
    workerId: 0,
    position: move.position
  };
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

    // Find the player ID for this user to check if it's their turn
    const player = Array.from(game.players.values()).find(p => p.userId === userId);
    const isCurrentPlayer = player ? game.currentPlayerId === player.id : false;

    return {
      gameId: game.id,
      status: filteredGameState.status as GameStatus,
      phase: filteredGameState.phase as GamePhase,
      currentPlayerId: filteredGameState.currentPlayerId,
      turnNumber: filteredGameState.turnNumber,
      version: filteredGameState.version,
      board: this.buildBoardView(filteredGameState.board),
      players: this.buildPlayersView(filteredGameState.players),
      availableMoves: isCurrentPlayer && availableMoves ? availableMoves.map(toSharedMove) : undefined,
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
      status: game.status as GameStatus,
      phase: game.phase as GamePhase,
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
