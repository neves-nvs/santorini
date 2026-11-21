import {
  BoardCellSnapshot,
  BoardSnapshot,
  Game,
  GameEvent,
  GameId,
  GamePhase,
  GameSnapshot,
  GameStatus,
  Player,
  UserId,
} from "@santorini/engine";
import { Kysely, Transaction } from "kysely";

import { db } from "@/database.ts";
import { playerIdSchema } from "@/idSchemas.ts";
import logger from "@/logger.ts";
import { sanitizeForLog } from "@/logSanitizer.ts";
import { Database, GameRow, NewPiece, PieceRow, PlayerRow } from "@/model.ts";

/** What the server records about a game that the rules do not need: when it was created, started and finished. */
export interface GameMetadata {
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface StoredGame {
  game: Game;
  metadata: GameMetadata;
}

function groupByGame<Row extends { game_id: GameId }>(rows: Row[]): Map<GameId, Row[]> {
  const groups = new Map<GameId, Row[]>();
  for (const row of rows) {
    groups.set(row.game_id, [...(groups.get(row.game_id) ?? []), row]);
  }
  return groups;
}

/**
 * Database adapter for Game aggregate
 * Converts between domain objects and database records
 */
export class GameRepositoryDb {
  constructor(private database: Kysely<Database> = db) {}

  /**
   * Find game by ID and convert to domain aggregate
   */
  async findById(gameId: GameId, database: Kysely<Database> = this.database): Promise<Game | null> {
    logger.debug(`Loading game ${gameId} from database`);

    // Load game record
    const gameRecord = await database.selectFrom("games").where("id", "=", gameId).selectAll().executeTakeFirst();

    if (!gameRecord) {
      return null;
    }

    const playerRecords = await this.loadPlayers(database, [gameId]);
    const pieceRecords = await this.loadPieces(database, [gameId]);

    return this.buildGame(gameRecord, playerRecords, pieceRecords);
  }

  private async loadPlayers(database: Kysely<Database>, gameIds: GameId[]): Promise<PlayerRow[]> {
    return database
      .selectFrom("players")
      .where("game_id", "in", gameIds)
      .select(["game_id", "user_id", "seat", "is_ready"])
      .orderBy("game_id")
      .orderBy("seat")
      .execute();
  }

  private async loadPieces(database: Kysely<Database>, gameIds: GameId[]): Promise<PieceRow[]> {
    return database.selectFrom("pieces").where("game_id", "in", gameIds).selectAll().execute();
  }

  /** Restores the aggregate from the rows of one game. */
  private buildGame(gameRecord: GameRow, playerRecords: PlayerRow[], pieceRecords: PieceRow[]): Game {
    const snapshot: GameSnapshot = {
      id: gameRecord.id,
      creatorId: gameRecord.user_creator_id,
      maxPlayers: gameRecord.player_count,
      status: gameRecord.game_status as GameStatus,
      phase: gameRecord.game_phase as GamePhase | null,
      currentPlayerId: gameRecord.current_player_id,
      turnNumber: gameRecord.turn_number || 0,
      placingTurnsCompleted: gameRecord.placing_turns_completed || 0,
      version: gameRecord.version,
      winnerId: gameRecord.winner_id,
      winReason: gameRecord.win_reason,
      lastMovedWorkerId: gameRecord.last_moved_worker_id,
      lastMovedWorkerPosition:
        gameRecord.last_moved_worker_x !== null && gameRecord.last_moved_worker_y !== null
          ? { x: gameRecord.last_moved_worker_x, y: gameRecord.last_moved_worker_y }
          : null,
      players: playerRecords.map((p) => {
        const player = new Player(playerIdSchema.parse(p.seat + 1), p.user_id, p.seat);
        player.setReady(p.is_ready);
        return player;
      }),
      board: this.convertPiecesToBoardSnapshot(pieceRecords),
    };

    return Game.fromSnapshot(snapshot);
  }

  /**
   * Create a new game with database-generated ID
   */
  async createNew(creatorId: UserId, maxPlayers: number): Promise<Game> {
    return this.insertGame(this.database, creatorId, maxPlayers);
  }

  /**
   * Create a new game and seat its creator in one transaction, so there is never a game without its creator
   */
  async createNewWithCreator(creatorId: UserId, maxPlayers: number): Promise<Game> {
    return this.database.transaction().execute(async (trx) => {
      const game = await this.insertGame(trx, creatorId, maxPlayers);
      game.addPlayer(new Player(playerIdSchema.parse(1), creatorId, 0));
      await this.write(trx, game);
      return game;
    });
  }

  private async insertGame(database: Kysely<Database>, creatorId: UserId, maxPlayers: number): Promise<Game> {
    logger.debug(`Creating new game for user ${sanitizeForLog(creatorId)}, max players: ${sanitizeForLog(maxPlayers)}`);

    const gameRecord = await database
      .insertInto("games")
      .values({
        user_creator_id: creatorId,
        player_count: maxPlayers,
        game_status: "waiting",
        turn_number: 0,
        placing_turns_completed: 0,
        created_at: new Date().toISOString(),
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    logger.debug(`Game ${gameRecord.id} created in database`);
    return Game.create(gameRecord.id, creatorId, maxPlayers);
  }

  /**
   * Load a game, change it and save it in one transaction that holds the lock of the game's row, so commands on
   * one game run one at a time and each one sees what the previous one saved. When `change` throws, nothing is
   * saved. Answers null when there is no such game.
   */
  async update(
    gameId: GameId,
    change: (game: Game) => GameEvent[],
  ): Promise<{ game: Game; events: GameEvent[] } | null> {
    return this.database.transaction().execute(async (trx) => {
      const locked = await trx.selectFrom("games").where("id", "=", gameId).select("id").forUpdate().executeTakeFirst();
      const game = locked ? await this.findById(gameId, trx) : null;
      if (!game) {
        return null;
      }

      const events = change(game);
      await this.write(trx, game);
      return { game, events };
    });
  }

  /**
   * Save game aggregate to database
   */
  async save(game: Game): Promise<void> {
    await this.database.transaction().execute((trx) => this.write(trx, game));
  }

  private async write(trx: Transaction<Database>, game: Game): Promise<void> {
    logger.debug(`Saving game ${game.id} to database`);

    const snapshot = game.toSnapshot();
    const now = new Date().toISOString();

    // Check if game exists, create if not
    const existingGame = await trx.selectFrom("games").where("id", "=", game.id).selectAll().executeTakeFirst();

    const columns = this.gameColumns(snapshot);

    if (existingGame) {
      await trx
        .updateTable("games")
        .set({
          ...columns,
          ...(existingGame.started_at === null && snapshot.status !== "waiting" ? { started_at: now } : {}),
          ...(existingGame.finished_at === null && snapshot.status === "completed" ? { finished_at: now } : {}),
        })
        .where("id", "=", game.id)
        .execute();
    } else {
      await trx
        .insertInto("games")
        .values({
          id: snapshot.id,
          user_creator_id: snapshot.creatorId,
          player_count: snapshot.maxPlayers,
          ...columns,
          created_at: now,
          started_at: snapshot.status === "waiting" ? undefined : now,
          finished_at: snapshot.status === "completed" ? now : undefined,
        })
        .execute();
    }

    await this.replacePlayers(trx, game.id, snapshot.players);

    // Update board state (pieces table)
    await this.saveBoardState(trx, game.id, snapshot.board);

    logger.debug(`Game ${game.id} saved successfully`);
  }

  /**
   * Find games by status
   */
  async findByStatus(status: GameStatus): Promise<StoredGame[]> {
    const gameRecords = await this.database
      .selectFrom("games")
      .where("game_status", "=", status)
      .selectAll()
      .orderBy("id", "desc")
      .execute();

    return this.loadStored(gameRecords);
  }

  /**
   * Find all games
   */
  async findAll(): Promise<StoredGame[]> {
    const gameRecords = await this.database.selectFrom("games").selectAll().orderBy("id", "desc").execute();

    return this.loadStored(gameRecords);
  }

  /**
   * Delete a game
   */
  async delete(gameId: GameId): Promise<void> {
    await this.database.deleteFrom("games").where("id", "=", gameId).execute();
  }

  /**
   * Find games where a user is a player (any status)
   */
  async findByPlayer(userId: UserId): Promise<StoredGame[]> {
    const gameRecords = await this.database
      .selectFrom("games")
      .innerJoin("players", "games.id", "players.game_id")
      .where("players.user_id", "=", userId)
      .selectAll("games")
      .orderBy("games.id", "desc")
      .execute();

    return this.loadStored(gameRecords);
  }

  /** The columns of a game that both an insert and an update write. */
  private gameColumns(snapshot: GameSnapshot) {
    return {
      game_status: snapshot.status,
      game_phase: snapshot.phase,
      current_player_id: snapshot.currentPlayerId,
      turn_number: snapshot.turnNumber,
      placing_turns_completed: snapshot.placingTurnsCompleted,
      version: snapshot.version,
      last_moved_worker_id: snapshot.lastMovedWorkerId,
      last_moved_worker_x: snapshot.lastMovedWorkerPosition?.x ?? null,
      last_moved_worker_y: snapshot.lastMovedWorkerPosition?.y ?? null,
      winner_id: snapshot.winnerId,
      win_reason: snapshot.winReason,
    };
  }

  private async replacePlayers(trx: Transaction<Database>, gameId: GameId, players: GameSnapshot["players"]) {
    await trx.deleteFrom("players").where("game_id", "=", gameId).execute();
    for (const player of players) {
      await trx
        .insertInto("players")
        .values({ game_id: gameId, user_id: player.userId, seat: player.seat, is_ready: player.isReady })
        .execute();
    }
  }

  /** Builds the games of a list from one query for their players and one for their pieces. */
  private async loadStored(records: GameRow[]): Promise<StoredGame[]> {
    if (records.length === 0) {
      return [];
    }

    const gameIds = records.map((record) => record.id);
    const players = groupByGame(await this.loadPlayers(this.database, gameIds));
    const pieces = groupByGame(await this.loadPieces(this.database, gameIds));

    return records.map((record) => ({
      game: this.buildGame(record, players.get(record.id) ?? [], pieces.get(record.id) ?? []),
      metadata: {
        createdAt: new Date(record.created_at),
        startedAt: record.started_at ? new Date(record.started_at) : null,
        finishedAt: record.finished_at ? new Date(record.finished_at) : null,
      },
    }));
  }

  /**
   * Find player user IDs by game ID
   */
  async findPlayersByGameId(gameId: GameId): Promise<number[]> {
    logger.debug(`Loading players for game ${gameId}`);

    const players = await this.database
      .selectFrom("players")
      .where("game_id", "=", gameId)
      .select(["user_id"])
      .execute();

    return players.map((player) => player.user_id);
  }

  /**
   * Get pieces by game ID (used by BoardService for legacy rule compatibility)
   */
  async getPiecesByGame(gameId: GameId): Promise<PieceRow[]> {
    logger.debug(`Loading pieces for game ${gameId}`);

    return this.database.selectFrom("pieces").where("game_id", "=", gameId).selectAll().execute();
  }

  /**
   * Convert pieces records to board snapshot
   */
  private convertPiecesToBoardSnapshot(pieces: PieceRow[]): BoardSnapshot {
    logger.debug(`Converting ${pieces.length} pieces to board snapshot`);

    // Create empty 5x5 board
    const cells: BoardCellSnapshot[][] = Array(5)
      .fill(null)
      .map(() =>
        Array(5)
          .fill(null)
          .map(() => ({ height: 0, hasDome: false, worker: null })),
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
        const playerId = playerIdSchema.parse(Number(owner));
        const workerId = piece_id;

        // Place worker on the board
        cells[x][y].worker = {
          playerId,
          workerId,
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
  private async saveBoardState(
    trx: Transaction<Database>,
    gameId: GameId,
    boardSnapshot: BoardSnapshot,
  ): Promise<void> {
    logger.debug(`Saving board state for game ${gameId}`);

    // Clear existing pieces
    await trx.deleteFrom("pieces").where("game_id", "=", gameId).execute();

    if (!boardSnapshot || !boardSnapshot.cells) {
      logger.debug("No board state to save");
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
            type: "building",
            owner: "none",
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
            type: "dome",
            owner: "none",
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
            type: "worker",
            owner: cell.worker.playerId.toString(), // Save as string number
          });
        }
      }
    }

    // Insert all pieces
    if (pieces.length > 0) {
      await trx.insertInto("pieces").values(pieces).execute();
      logger.debug(`Saved ${pieces.length} pieces for game ${gameId}`);
    }
  }
}
