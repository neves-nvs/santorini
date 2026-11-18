import { Database, NewUser, UserRow, UserUpdate } from "@/model.ts";
import { Kysely, Transaction } from "kysely";

import { UserId } from "@santorini/engine";
import { db } from "@/database.ts";

export async function findUser(criteria: Partial<UserRow>): Promise<UserRow | undefined> {
  let query = db.selectFrom("users");

  if (criteria.id) {
    query = query.where("id", "=", criteria.id);
  }

  if (criteria.username) {
    query = query.where("username", "=", criteria.username);
  }

  if (criteria.created_at) {
    query = query.where("created_at", "=", criteria.created_at);
  }

  return await query.selectAll().executeTakeFirst();
}

export async function findUserByUsername(
  username: string,
  trx: Transaction<Database> | Kysely<Database> = db,
): Promise<UserRow | undefined> {
  return await trx.selectFrom("users").where("username", "=", username).selectAll().executeTakeFirst();
}

/** Inserts the user, or answers undefined when the username is taken: one statement, so two requests cannot both win. */
export async function createUser(user: NewUser): Promise<UserRow | undefined> {
  return await db
    .insertInto("users")
    .values(user)
    .onConflict((conflict) => conflict.column("username").doNothing())
    .returningAll()
    .executeTakeFirst();
}

export async function updateUser(id: UserId, user: UserUpdate): Promise<UserRow | undefined> {
  return await db.updateTable("users").set(user).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function updateUserByUsername(username: string, user: UserUpdate): Promise<UserRow | undefined> {
  return await db.updateTable("users").set(user).where("username", "=", username).returningAll().executeTakeFirst();
}

export async function deleteUser(id: UserId): Promise<void> {
  await db.deleteFrom("users").where("id", "=", id).execute();
}
