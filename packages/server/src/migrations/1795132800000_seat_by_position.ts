/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from "kysely";

// A player used to be identified by a player id, the seat plus one, stored in current_player_id, winner_id and the
// owner of every worker. Now the seat is the position in the game (from 0) and the winner is a user. The old
// current_player_id and winner_id both pointed at users.id although they held player ids, so only the winner keeps
// that constraint.

// The tables as they are once the columns are renamed, which is when the data is rewritten.
interface Tables {
  games: { id: number; current_seat: number | null; winner_user_id: number | null };
  players: { game_id: number; user_id: number; seat: number };
  pieces: { owner: string };
}

export async function up(db: Kysely<any>) {
  await db.schema.alterTable("games").dropConstraint("games_current_player_id_fkey").ifExists().execute();
  await db.schema.alterTable("games").renameColumn("current_player_id", "current_seat").execute();
  await db.schema.alterTable("games").renameColumn("winner_id", "winner_user_id").execute();

  const tables = db as Kysely<Tables>;
  await tables
    .updateTable("games")
    .set((eb) => ({ current_seat: eb("current_seat", "-", 1) }))
    .where("current_seat", "is not", null)
    .execute();
  await tables
    .updateTable("games")
    .set((eb) => ({
      winner_user_id: eb
        .selectFrom("players")
        .select("players.user_id")
        .whereRef("players.game_id", "=", "games.id")
        .where("players.seat", "=", eb("games.winner_user_id", "-", 1)),
    }))
    .where("winner_user_id", "is not", null)
    .execute();
  await tables
    .updateTable("pieces")
    .set((eb) => ({ owner: eb.cast(eb(eb.cast("owner", "integer"), "-", 1), "text") }))
    .where("owner", "<>", "none")
    .execute();
}

export async function down(db: Kysely<any>) {
  const tables = db as Kysely<Tables>;
  await tables
    .updateTable("pieces")
    .set((eb) => ({ owner: eb.cast(eb(eb.cast("owner", "integer"), "+", 1), "text") }))
    .where("owner", "<>", "none")
    .execute();
  await tables
    .updateTable("games")
    .set((eb) => ({
      winner_user_id: eb
        .selectFrom("players")
        .select((players) => players("players.seat", "+", 1).as("player_id"))
        .whereRef("players.game_id", "=", "games.id")
        .whereRef("players.user_id", "=", "games.winner_user_id"),
    }))
    .where("winner_user_id", "is not", null)
    .execute();
  await tables
    .updateTable("games")
    .set((eb) => ({ current_seat: eb("current_seat", "+", 1) }))
    .where("current_seat", "is not", null)
    .execute();

  await db.schema.alterTable("games").renameColumn("winner_user_id", "winner_id").execute();
  await db.schema.alterTable("games").renameColumn("current_seat", "current_player_id").execute();
}
