import { Kysely, sql } from "kysely";
import { db } from "../src/database";

async function up(db: Kysely<any>) {
  await db.schema
    .createTable("users")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("username", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("password", "varchar(255)")
    .addColumn("google_id", "varchar(255)", (col) => col.unique())
    .addColumn("display_name", "varchar(255)")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  // await db.schema
  //   .createTable("games")
  //   .addColumn("id", "serial", (col) => col.primaryKey())
  //   .addColumn("state", "jsonb", (col) => col.notNull().defaultTo("{}"))
  //   .addColumn("created_at", "timestamp", (col) =>
  //     col.notNull().defaultTo(sql`now()`),
  //   )
  //   .execute();

  //   await db.schema
  //     .createTable("positions")
  //     .addColumn("id", "serial", (col) => col.primaryKey())
  //     .addColumn("game_id", "integer", (col) =>
  //       col.notNull().references("games.id").onDelete("cascade"),
  //     )
  //     .addColumn("row", "integer", (col) => col.notNull())
  //     .addColumn("col", "integer", (col) => col.notNull())
  //     .addUniqueConstraint("game_position", ["game_id", "row", "col"])
  //     .execute();

  //   await db.schema
  //     .createTable("pieces")
  //     .addColumn("id", "serial", (col) => col.primaryKey())
  //     .addColumn("position_id", "integer", (col) =>
  //       col.notNull().references("positions.id").onDelete("cascade"),
  //     )
  //     .addColumn("piece_type", "varchar(50)", (col) => col.notNull())
  //     .addColumn("piece_data", "jsonb", (col) => col.notNull().defaultTo("{}"))
  //     .addColumn("created_at", "timestamp", (col) =>
  //       col.notNull().defaultTo(sql`now()`),
  //     )
  //     .execute();
}

async function down() {
  // await db.schema.dropTable("pieces").execute();
  // await db.schema.dropTable("positions").execute();
  // await db.schema.dropTable("games").execute();
  await db.schema.dropTable("users").execute();
}

export { up, down };
