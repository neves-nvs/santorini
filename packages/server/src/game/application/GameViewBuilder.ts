import {
  Board,
  BuildMove,
  Game,
  Move,
  MoveWorkerMove,
  PlaceWorkerMove,
  Player,
  UserId,
  VisibilityPolicy,
} from "@santorini/engine";
import {
  BoardView,
  CellView,
  GamePhase,
  GameStatus,
  GameView,
  Move as SharedMove,
  PlayerView,
  Viewer,
} from "@santorini/shared";

/**
 * Convert domain Move to shared Move format
 */
export function toSharedMove(move: Move): SharedMove {
  if (move instanceof PlaceWorkerMove) {
    return {
      type: "place_worker",
      workerId: move.workerId,
      position: move.position,
    };
  } else if (move instanceof MoveWorkerMove) {
    return {
      type: "move_worker",
      workerId: move.workerId,
      fromPosition: move.fromPosition,
      position: move.position,
    };
  } else if (move instanceof BuildMove) {
    const buildType = move.type as "build_block" | "build_dome";
    return {
      type: buildType,
      workerId: move.workerId,
      position: move.position,
    };
  }
  // Fallback - shouldn't reach here
  return {
    type: "build_block",
    workerId: 0,
    position: move.position,
  };
}

/**
 * Domain service that builds the view of a game for one user
 * Centralizes view generation logic with visibility policies
 */
export class GameViewBuilder {
  constructor(private visibilityPolicy: VisibilityPolicy = new VisibilityPolicy()) {}

  /**
   * The game as this user sees it: a player gets the moves they can play now, anyone else watches
   */
  buildFor(game: Game, userId: UserId): GameView {
    const state = this.visibilityPolicy.filterGameState(game, userId);

    const player = state.players.find((p) => p.userId === userId);
    const isCurrentPlayer = player !== undefined && game.currentPlayerId === player.id;
    const viewer: Viewer = player
      ? {
          role: "player",
          playerId: player.id,
          isCurrentPlayer,
          availableMoves: isCurrentPlayer ? game.getAvailableMoves().map(toSharedMove) : [],
        }
      : { role: "spectator" };

    return {
      gameId: game.id,
      status: state.status as GameStatus,
      phase: state.phase as GamePhase,
      maxPlayers: game.maxPlayers,
      currentPlayerId: state.currentPlayerId,
      turnNumber: state.turnNumber,
      version: state.version,
      board: this.buildBoardView(state.board),
      players: this.buildPlayersView(state.players),
      winnerPlayerId: state.winnerId,
      winReason: state.winReason,
      viewer,
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
          worker: cell?.worker
            ? {
                playerId: cell.worker.playerId,
                workerId: cell.worker.workerId,
              }
            : null,
        };
      }
    }
    return { cells };
  }

  /**
   * Build players representation for frontend
   */
  private buildPlayersView(players: Player[]): PlayerView[] {
    return players.map((player) => ({
      id: player.id,
      userId: player.userId,
      seat: player.seat,
      status: player.status,
      isReady: player.isReady,
    }));
  }
}
