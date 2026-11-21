import { Game, UserId } from "@santorini/engine";
import { Kysely, Transaction } from "kysely";

import { db } from "@/database.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { Database } from "@/model.ts";

import { Lobby } from "./Lobby.ts";

export class LobbyRepository {
  constructor(
    private database: Kysely<Database> = db,
    private games: GameRepositoryDb = new GameRepositoryDb(database),
  ) {}

  /** A new lobby with its creator in the first seat. */
  async create(creatorId: UserId, maxPlayers: number): Promise<Lobby> {
    return this.database.transaction().execute(async (trx) => {
      const { id } = await trx
        .insertInto("lobbies")
        .values({ user_creator_id: creatorId, max_players: maxPlayers })
        .returning("id")
        .executeTakeFirstOrThrow();

      const lobby = new Lobby(id, creatorId, maxPlayers, [{ userId: creatorId, isReady: false }]);
      await this.writePlayers(trx, lobby);
      return lobby;
    });
  }

  async findById(id: number): Promise<Lobby | null> {
    return this.load(this.database, id);
  }

  /**
   * Load a lobby, change it and save it in one transaction that holds the lock of the lobby's row, so commands on
   * one lobby run one at a time. When `change` throws, nothing is saved. Answers null when there is no such lobby.
   */
  async update(id: number, change: (lobby: Lobby) => void): Promise<Lobby | null> {
    return this.database.transaction().execute(async (trx) => {
      const lobby = await this.load(trx, id, true);
      if (!lobby) {
        return null;
      }

      change(lobby);
      await this.writePlayers(trx, lobby);
      return lobby;
    });
  }

  /**
   * Turn a lobby into a game that is already in progress and remove the lobby, in one transaction. Two starts
   * that arrive together make one game: the second finds no lobby. Answers null when there is no such lobby.
   */
  async start(id: number): Promise<Game | null> {
    return this.database.transaction().execute(async (trx) => {
      const lobby = await this.load(trx, id, true);
      if (!lobby) {
        return null;
      }

      const game = await this.games.createStarted(trx, lobby.start());
      await trx.deleteFrom("lobbies").where("id", "=", id).execute();
      return game;
    });
  }

  private async load(database: Kysely<Database>, id: number, forUpdate = false): Promise<Lobby | null> {
    const query = database.selectFrom("lobbies").where("id", "=", id).selectAll();
    const row = await (forUpdate ? query.forUpdate() : query).executeTakeFirst();
    if (!row) {
      return null;
    }

    const players = await database
      .selectFrom("lobby_players")
      .where("lobby_id", "=", id)
      .select(["user_id", "is_ready"])
      .orderBy("seat")
      .execute();

    return new Lobby(
      row.id,
      row.user_creator_id,
      row.max_players,
      players.map((player) => ({ userId: player.user_id, isReady: player.is_ready })),
    );
  }

  private async writePlayers(trx: Transaction<Database>, lobby: Lobby): Promise<void> {
    await trx.deleteFrom("lobby_players").where("lobby_id", "=", lobby.id).execute();
    for (const [seat, player] of lobby.players.entries()) {
      await trx
        .insertInto("lobby_players")
        .values({ lobby_id: lobby.id, user_id: player.userId, seat, is_ready: player.isReady })
        .execute();
    }
  }
}
