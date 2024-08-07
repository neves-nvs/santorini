import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface Database {
  users: UserTable;
}

export interface UserTable {
  id: Generated<number>;
  username: string;
  google_id: string | null;
  display_name: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export type UserUpdate = Updateable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type User = Selectable<UserTable>;
