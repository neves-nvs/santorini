import { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export interface Database {
  users: UserTable;
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
  created_at: ColumnType<Date, string | undefined, never>;
}

export type UserUpdate = Updateable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type User = Selectable<UserTable>;

export interface GameTable {
  id: Generated<number>;
  state: ColumnType<unknown, unknown, unknown>;
  created_at: ColumnType<Date, string | undefined, never>;
}
