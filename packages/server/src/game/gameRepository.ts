import { Game, GameUpdate, NewGame, NewPlayer, User } from "../model";

import { db } from "../database";

export async function findGameById(gameId: number): Promise<Game | undefined> {
  return db.selectFrom("games").where("id", "=", gameId).selectAll().executeTakeFirst();
}

export async function getAllGames(): Promise<Game[]> {
  return db.selectFrom("games").selectAll().execute();
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

export async function findPlayersByGameId(gameId: number): Promise<number[]> {
  return db
    .selectFrom("players")
    .where("game_id", "=", gameId)
    .selectAll()
    .execute()
    .then((players) => players.map((player) => player.user_id));
}

export async function addPlayerToGame(gameId: number, userId: number): Promise<void> {
  await db
    .insertInto("players")
    .values({ game_id: gameId, user_id: userId } as NewPlayer)
    .execute();
}

export async function removePlayerFromGame(gameId: number, userId: number): Promise<void> {
  await db.deleteFrom("players").where("game_id", "=", gameId).where("user_id", "=", userId).execute();
}

/* -------------------------------------------------------------------------- */
/*                                    Users                                   */
/* -------------------------------------------------------------------------- */

export async function findUsersByGame(gameId: number): Promise<User[]> {
  return db
    .selectFrom("users")
    .innerJoin("players", "users.id", "players.user_id")
    .innerJoin("games", "players.game_id", "games.id")
    .where("games.id", "=", gameId)
    .selectAll("users")
    .execute();
}
