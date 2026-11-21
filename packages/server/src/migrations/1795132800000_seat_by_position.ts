/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from "kysely";

// A player used to be identified by a player id, the seat plus one, stored in current_player_id, winner_id and the
// owner of every worker. Now the seat is the position in the game (from 0) and the winner is a user. The old
// current_player_id and winner_id both pointed at users.id although they held player ids, so only the winner keeps
// that constraint.
export async function up(db: Kysely<any>) {
  await sql`alter table games drop constraint if exists games_current_player_id_fkey`.execute(db);
  await sql`alter table games rename column current_player_id to current_seat`.execute(db);
  await sql`update games set current_seat = current_seat - 1 where current_seat is not null`.execute(db);

  await sql`alter table games rename column winner_id to winner_user_id`.execute(db);
  await sql`
    update games
    set winner_user_id = (
      select players.user_id from players where players.game_id = games.id and players.seat = games.winner_user_id - 1
    )
    where winner_user_id is not null
  `.execute(db);

  await sql`update pieces set owner = (owner::integer - 1)::text where owner <> 'none'`.execute(db);
}

export async function down(db: Kysely<any>) {
  await sql`update pieces set owner = (owner::integer + 1)::text where owner <> 'none'`.execute(db);

  await sql`
    update games
    set winner_user_id = (
      select players.seat + 1 from players where players.game_id = games.id and players.user_id = games.winner_user_id
    )
    where winner_user_id is not null
  `.execute(db);
  await sql`alter table games rename column winner_user_id to winner_id`.execute(db);

  await sql`update games set current_seat = current_seat + 1 where current_seat is not null`.execute(db);
  await sql`alter table games rename column current_seat to current_player_id`.execute(db);
}
