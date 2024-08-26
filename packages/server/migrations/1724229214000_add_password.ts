import { Kysely } from "kysely";
import { db } from "../src/database";
import bcrypt from "bcryptjs";

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable("users")
    .addColumn("password_hash", "varchar")
    .addColumn("password_salt", "varchar")
    .execute();

  await hashExistingPasswords(db);
}

async function hashExistingPasswords(db: Kysely<any>) {
  const users = await db.selectFrom("users").selectAll().execute();

  for (const user of users) {
    if (user.password) {
      const salt = await bcrypt.genSalt(10);

      const hash = await bcrypt.hash(user.password, salt);

      await db
        .updateTable("users")
        .set({
          password_hash: hash,
          password_salt: salt,
        })
        .where("id", "=", user.id)
        .execute();
    }
  }
}

export async function down() {
  await db.schema.alterTable("users").dropColumn("password_hash").dropColumn("password_salt").execute();
}
