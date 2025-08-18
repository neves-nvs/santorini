import { Database, Game, GameUpdate, NewGame, NewPlayer, User, Piece } from "../model";
import { Kysely, Transaction } from "kysely";

import { db } from "../database";

export async function findGameById(
  gameId: number,
  database: Transaction<Database> | Kysely<Database> = db,
  forUpdate = false,
): Promise<Game | undefined> {
  let query = database.selectFrom("games").where("id", "=", gameId);

  if (forUpdate) {
    query = query.forUpdate();
  }

  return query.selectAll().executeTakeFirst();
}

export async function getAllGames(database: Transaction<Database> | Kysely<Database> = db): Promise<Game[]> {
  return database.selectFrom("games").selectAll().orderBy("id", "desc").execute();
}

export async function createGame(game: NewGame): Promise<Game> {
  return await db.insertInto("games").values(game).returningAll().executeTakeFirstOrThrow();
}

export async function updateGame(id: number, game: GameUpdate): Promise<Game | undefined> {
  return await db.updateTable("games").set(game).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteGame(id: number): Promise<void> {
  await db.deleteFrom("games").where("id", "=", id).execute();
}

/* -------------------------------------------------------------------------- */
/*                                   PLAYERS                                  */
/* -------------------------------------------------------------------------- */

export async function findPlayersByGameId(
  gameId: number,
  database: Transaction<Database> | Kysely<Database> = db,
  forUpdate = false,
): Promise<number[]> {
  let query = database.selectFrom("players").where("game_id", "=", gameId);

  if (forUpdate) {
    query = query.forUpdate();
  }

  return query
    .selectAll()
    .execute()
    .then((players) => players.map((player) => player.user_id));
}

export async function addPlayerToGame(
  gameId: number,
  userId: number,
  database: Transaction<Database> | Kysely<Database> = db,
): Promise<void> {
  await database
    .insertInto("players")
    .values({ game_id: gameId, user_id: userId } as NewPlayer)
    .execute();
}

// Player ready functionality moved to in-memory tracking in gameSession.ts

export async function removePlayerFromGame(gameId: number, userId: number): Promise<void> {
  await db.deleteFrom("players").where("game_id", "=", gameId).where("user_id", "=", userId).execute();
}

/* -------------------------------------------------------------------------- */
/*                                    Users                                   */
/* -------------------------------------------------------------------------- */

export async function findUsersByGame(
  gameId: number,
  database: Transaction<Database> | Kysely<Database> = db,
): Promise<User[]> {
  return database
    .selectFrom("users")
    .innerJoin("players", "users.id", "players.user_id")
    .innerJoin("games", "players.game_id", "games.id")
    .where("games.id", "=", gameId)
    .selectAll("users")
    .execute();
}

/* -------------------------------------------------------------------------- */
/*                                   PIECES                                   */
/* -------------------------------------------------------------------------- */

export async function getPiecesByGame(gameId: number): Promise<Piece[]> {
  return await db.selectFrom("pieces").where("game_id", "=", gameId).selectAll().execute();
}
