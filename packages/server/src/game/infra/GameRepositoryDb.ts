import { BoardCellSnapshot, BoardSnapshot } from '../domain/Board';
import { Database, NewPiece, Piece } from '../../model';
import { Game, GameSnapshot } from '../domain/Game';
import { GamePhase, GameStatus } from '../domain/types';
import { Kysely, Transaction } from 'kysely';
import { Player } from '../domain/Player';
import { db } from '../../database';

import logger from '../../logger';

/**
 * Database adapter for Game aggregate
 * Converts between domain objects and database records
 */
export class GameRepositoryDb {
  constructor(private database: Kysely<Database> = db) {}

  /**
   * Find game by ID and convert to domain aggregate
   */
  async findById(gameId: number): Promise<Game | null> {
    logger.debug(`Loading game ${gameId} from database`);

    // Load game record
    const gameRecord = await this.database
      .selectFrom('games')
      .where('id', '=', gameId)
      .selectAll()
      .executeTakeFirst();

    if (!gameRecord) {
      return null;
    }

    // Load players
    const playerRecords = await this.database
      .selectFrom('players')
      .innerJoin('users', 'players.user_id', 'users.id')
      .where('players.game_id', '=', gameId)
      .select([
        'players.user_id',
        'players.is_ready',
        'users.username'
      ])
      .execute();

    // Load board state (pieces)
    const pieceRecords = await this.database
      .selectFrom('pieces')
      .where('game_id', '=', gameId)
      .selectAll()
      .execute();

    // Convert to domain snapshot
    const snapshot: GameSnapshot = {
      id: gameRecord.id,
      creatorId: gameRecord.user_creator_id,
      maxPlayers: gameRecord.player_count,
      status: gameRecord.game_status as GameStatus,
      phase: gameRecord.game_phase as GamePhase | null,
      currentPlayerId: gameRecord.current_player_id,
      turnNumber: gameRecord.turn_number || 0,
      placingTurnsCompleted: gameRecord.placing_turns_completed || 0,
      version: 1, // Default version since not in database
      winnerId: gameRecord.winner_id,
      winReason: gameRecord.win_reason,
      createdAt: gameRecord.created_at ? new Date(gameRecord.created_at) : new Date(),
      startedAt: gameRecord.started_at ? new Date(gameRecord.started_at) : null,
      finishedAt: gameRecord.finished_at ? new Date(gameRecord.finished_at) : null,
      lastMovedWorkerId: gameRecord.last_moved_worker_id,
      lastMovedWorkerPosition: gameRecord.last_moved_worker_x !== null && gameRecord.last_moved_worker_y !== null
        ? { x: gameRecord.last_moved_worker_x, y: gameRecord.last_moved_worker_y }
        : null,
      players: playerRecords.map((p, index) => {
        const player = new Player(
          index + 1, // Player ID within game
          p.user_id, // User ID
          index // Seat
        );
        player.setReady(p.is_ready);
        return player;
      }),
      board: this.convertPiecesToBoardSnapshot(pieceRecords)
    };

    // Restore domain aggregate from snapshot
    return Game.fromSnapshot(snapshot);
  }

  /**
   * Create a new game with database-generated ID
   */
  async createNew(creatorId: number, maxPlayers: number): Promise<Game> {
    logger.debug(`Creating new game for user ${creatorId}, max players: ${maxPlayers}`);

    const gameRecord = await this.database
      .insertInto('games')
      .values({
        user_creator_id: creatorId,
        player_count: maxPlayers,
        game_status: 'waiting',
        turn_number: 0,
        placing_turns_completed: 0,
        created_at: new Date().toISOString()
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    // Create domain aggregate with the database-generated ID
    const game = Game.create(gameRecord.id, creatorId, maxPlayers);

    logger.debug(`Game ${gameRecord.id} created in database`);
    return game; // Return the created game
  }

  /**
   * Save game aggregate to database
   */
  async save(game: Game): Promise<void> {
    logger.debug(`Saving game ${game.id} to database`);

    const snapshot = game.toSnapshot();

    await this.database.transaction().execute(async (trx) => {
      // Check if game exists, create if not
      const existingGame = await trx
        .selectFrom('games')
        .where('id', '=', game.id)
        .selectAll()
        .executeTakeFirst();

      if (existingGame) {
        // Update existing game
        await trx
          .updateTable('games')
          .set({
            game_status: snapshot.status,
            game_phase: snapshot.phase,
            current_player_id: snapshot.currentPlayerId,
            turn_number: snapshot.turnNumber,
            placing_turns_completed: snapshot.placingTurnsCompleted,
            last_moved_worker_id: snapshot.lastMovedWorkerId,
            last_moved_worker_x: snapshot.lastMovedWorkerPosition?.x || null,
            last_moved_worker_y: snapshot.lastMovedWorkerPosition?.y || null,
            winner_id: snapshot.winnerId,
            win_reason: snapshot.winReason,
            started_at: snapshot.startedAt ? snapshot.startedAt.toISOString() : null,
            finished_at: snapshot.finishedAt ? snapshot.finishedAt.toISOString() : null
          })
          .where('id', '=', game.id)
          .execute();

        // Update players - clear existing and re-insert
        await trx.deleteFrom('players').where('game_id', '=', game.id).execute();
        for (const player of snapshot.players) {
          await trx
            .insertInto('players')
            .values({
              game_id: game.id,
              user_id: player.userId,
              is_ready: player.isReady
            })
            .execute();
        }
      } else {
        // Create new game
        await trx
          .insertInto('games')
          .values({
            id: snapshot.id,
            user_creator_id: snapshot.creatorId,
            player_count: snapshot.maxPlayers,
            game_status: snapshot.status,
            game_phase: snapshot.phase,
            current_player_id: snapshot.currentPlayerId,
            turn_number: snapshot.turnNumber,
            placing_turns_completed: snapshot.placingTurnsCompleted,
            last_moved_worker_id: snapshot.lastMovedWorkerId,
            last_moved_worker_x: snapshot.lastMovedWorkerPosition?.x || null,
            last_moved_worker_y: snapshot.lastMovedWorkerPosition?.y || null,
            winner_id: snapshot.winnerId,
            win_reason: snapshot.winReason,
            created_at: snapshot.createdAt.toISOString(),
            started_at: snapshot.startedAt ? snapshot.startedAt.toISOString() : undefined,
            finished_at: snapshot.finishedAt ? snapshot.finishedAt.toISOString() : undefined
          })
          .execute();

        // Add players
        for (const player of snapshot.players) {
          await trx
            .insertInto('players')
            .values({
              game_id: game.id,
              user_id: player.userId,
              is_ready: player.isReady
            })
            .execute();
        }
      }

      // Update board state (pieces table)
      await this.saveBoardState(trx, game.id, snapshot.board);
    });

    logger.debug(`Game ${game.id} saved successfully`);
  }

  /**
   * Find games by status
   */
  async findByStatus(status: GameStatus): Promise<Game[]> {
    const gameRecords = await this.database
      .selectFrom('games')
      .where('game_status', '=', status)
      .selectAll()
      .orderBy('id', 'desc')
      .execute();

    const games: Game[] = [];
    for (const record of gameRecords) {
      const game = await this.findById(record.id);
      if (game) {
        games.push(game);
      }
    }

    return games;
  }

  /**
   * Find all games
   */
  async findAll(): Promise<Game[]> {
    const gameRecords = await this.database
      .selectFrom('games')
      .selectAll()
      .orderBy('id', 'desc')
      .execute();

    const games: Game[] = [];
    for (const record of gameRecords) {
      const game = await this.findById(record.id);
      if (game) {
        games.push(game);
      }
    }

    return games;
  }

  /**
   * Delete a game
   */
  async delete(gameId: number): Promise<void> {
    await this.database
      .deleteFrom('games')
      .where('id', '=', gameId)
      .execute();
  }

  /**
   * Find player user IDs by game ID
   */
  async findPlayersByGameId(gameId: number): Promise<number[]> {
    logger.debug(`Loading players for game ${gameId}`);

    const players = await this.database
      .selectFrom('players')
      .where('game_id', '=', gameId)
      .select(['user_id'])
      .execute();

    return players.map(player => player.user_id);
  }

  /**
   * Get pieces by game ID (used by BoardService for legacy rule compatibility)
   */
  async getPiecesByGame(gameId: number): Promise<Piece[]> {
    logger.debug(`Loading pieces for game ${gameId}`);

    return this.database
      .selectFrom('pieces')
      .where('game_id', '=', gameId)
      .selectAll()
      .execute();
  }

  /**
   * Convert pieces records to board snapshot
   */
  private convertPiecesToBoardSnapshot(pieces: Piece[]): BoardSnapshot {
    logger.debug(`Converting ${pieces.length} pieces to board snapshot`);

    // Create empty 5x5 board
    const cells: BoardCellSnapshot[][] = Array(5).fill(null).map(() =>
      Array(5).fill(null).map(() => ({ height: 0, hasDome: false, worker: null }))
    );

    // Process each piece
    for (const piece of pieces) {
      const { x, y, height, type, owner, piece_id } = piece;

      // Validate coordinates
      if (x < 0 || x >= 5 || y < 0 || y >= 5) {
        logger.warn(`Skipping piece with invalid coordinates: x=${x}, y=${y}`);
        continue;
      }

      if (type === "worker") {
        const playerId = parseInt(owner);
        const workerId = piece_id;

        // Place worker on the board
        cells[x][y].worker = {
          playerId,
          workerId
        };
      } else if (type === "building") {
        // Set building height
        cells[x][y].height = height;
      } else if (type === "dome") {
        // Place dome
        cells[x][y].hasDome = true;
      }
    }

    return { cells };
  }

  /**
   * Save board state to pieces table
   */
  private async saveBoardState(trx: Transaction<Database>, gameId: number, boardSnapshot: BoardSnapshot): Promise<void> {
    logger.debug(`Saving board state for game ${gameId}`);

    // Clear existing pieces
    await trx.deleteFrom('pieces').where('game_id', '=', gameId).execute();

    if (!boardSnapshot || !boardSnapshot.cells) {
      logger.debug('No board state to save');
      return;
    }

    // Collect all pieces (workers, buildings, domes)
    const pieces: NewPiece[] = [];
    let pieceIdCounter = 1;

    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const cell = boardSnapshot.cells[x]?.[y];
        if (!cell) continue;

        // Save building height if > 0
        if (cell.height > 0) {
          pieces.push({
            game_id: gameId,
            piece_id: pieceIdCounter++,
            x,
            y,
            height: cell.height,
            type: 'building',
            owner: 'none'
          });
        }

        // Save dome if present
        if (cell.hasDome) {
          pieces.push({
            game_id: gameId,
            piece_id: pieceIdCounter++,
            x,
            y,
            height: cell.height,
            type: 'dome',
            owner: 'none'
          });
        }

        // Save worker if present
        if (cell.worker) {
          pieces.push({
            game_id: gameId,
            piece_id: cell.worker.workerId, // Use actual worker ID
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
      await trx.insertInto('pieces').values(pieces).execute();
      logger.debug(`Saved ${pieces.length} pieces for game ${gameId}`);
    }
  }
}
