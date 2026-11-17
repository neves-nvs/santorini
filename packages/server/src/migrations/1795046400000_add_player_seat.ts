/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from "kysely";

// Until now the seat of a player was worked out on every load from the order of the user ids. The backfill keeps
// that order, so the player ids that running games already store (current_player_id, winner_id, the pieces) still
// point at the same players.
export async function up(db: Kysely<any>) {
  await db.schema.alterTable("players").addColumn("seat", "integer").execute();

  await sql`
    update players
    set seat = ranked.seat
    from (
      select game_id, user_id, row_number() over (partition by game_id order by user_id) - 1 as seat
      from players
    ) as ranked
    where players.game_id = ranked.game_id and players.user_id = ranked.user_id
  `.execute(db);

  await db.schema
    .alterTable("players")
    .alterColumn("seat", (column) => column.setNotNull())
    .execute();
  await db.schema.alterTable("players").addUniqueConstraint("seat_per_game", ["game_id", "seat"]).execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable("players").dropColumn("seat").execute();
}
