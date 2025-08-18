import { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export interface Database {
  users: UserTable;
  games: GameTable;
  players: PlayerTable;
  pieces: PieceTable;
}

export interface UserTable {
  id: Generated<number>;
  username: string;
  display_name: string;
  // google auth
  google_id: string | null;
  // password auth
  password_hash: string | null;
  password_salt: string | null;
  // e-mail: string;
  created_at: ColumnType<Date, string, never>;
}

export type UserUpdate = Updateable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type User = Selectable<UserTable>;

export type GameStatus = "waiting" | "ready" | "in-progress" | "completed" | "aborted";
export type GamePhase = "placing" | "moving" | "building";

export interface GameTable {
  id: Generated<number>;
  user_creator_id: number;

  player_count: number;

  game_status: GameStatus;
  game_phase: GamePhase | null;
  current_player_id: number | null;
  turn_number: number;
  placing_turns_completed: number;

  // Worker tracking for building restrictions
  last_moved_worker_id: number | null;
  last_moved_worker_x: number | null;
  last_moved_worker_y: number | null;

  winner_id: number | null;
  win_reason: string | null;

  created_at: ColumnType<Date, string, never>;
  started_at: ColumnType<Date | null, string | undefined, never>;
  finished_at: ColumnType<Date | null, string | undefined, never>;
  completed_at: ColumnType<Date | null, string | undefined, never>;
}

export type GameUpdate = Updateable<GameTable>;
export type NewGame = Insertable<GameTable>;
export type Game = Selectable<GameTable>;

export interface PlayerTable {
  game_id: number;
  user_id: number;
}

export type PlayerUpdate = Updateable<PlayerTable>;
export type NewPlayer = Insertable<PlayerTable>;
export type Player = Selectable<PlayerTable>;

export interface PieceTable {
  // TODO make primary key (game_id, piece_id)
  id: Generated<number>;
  game_id: number;
  piece_id: number;
  x: number;
  y: number;
  height: number;
  type: string;
  owner: string;
}

export type PieceUpdate = Updateable<PieceTable>;
export type NewPiece = Insertable<PieceTable>;
export type Piece = Selectable<PieceTable>;
