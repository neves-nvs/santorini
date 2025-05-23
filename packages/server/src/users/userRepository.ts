import { Database, NewUser, User, UserUpdate } from "../model";
import { Kysely, Transaction } from "kysely";

import { db } from "../database";

export async function findUser(criteria: Partial<User>): Promise<User | undefined> {
  let query = db.selectFrom("users");

  if (criteria.id) {
    query = query.where("id", "=", criteria.id);
  }

  if (criteria.username) {
    query = query.where("username", "=", criteria.username);
  }

  if (criteria.google_id !== undefined) {
    query = query.where("google_id", criteria.google_id === null ? "is" : "=", criteria.google_id);
  }

  if (criteria.created_at) {
    query = query.where("created_at", "=", criteria.created_at);
  }

  return await query.selectAll().executeTakeFirst();
}

export async function findUserByUsername(
  username: string,
  trx: Transaction<Database> | Kysely<Database> = db,
): Promise<User | undefined> {
  return await trx.selectFrom("users").where("username", "=", username).selectAll().executeTakeFirst();
}

export async function findAllUsers(): Promise<User[]> {
  return await db.selectFrom("users").selectAll().execute();
}

export async function createUser(user: NewUser): Promise<User> {
  return await db.insertInto("users").values(user).returningAll().executeTakeFirstOrThrow();
}

export async function updateUser(id: number, user: UserUpdate): Promise<User | undefined> {
  return await db.updateTable("users").set(user).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function updateUserByUsername(username: string, user: UserUpdate): Promise<User | undefined> {
  return await db.updateTable("users").set(user).where("username", "=", username).returningAll().executeTakeFirst();
}

export async function deleteUser(id: number): Promise<void> {
  await db.deleteFrom("users").where("id", "=", id).execute();
}

/* -------------------------------------------------------------------------- */
/*                                   GOOGLE                                   */
/* -------------------------------------------------------------------------- */

export async function findUserByGoogleId(googleId: string): Promise<User | undefined> {
  return await db.selectFrom("users").where("google_id", "=", googleId).selectAll().executeTakeFirst();
}
