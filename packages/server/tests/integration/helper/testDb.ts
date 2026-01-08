import { db } from "../../../src/database";
import { sql } from "kysely";

/**
 * Fast truncation-based test cleanup
 * Much faster than individual deletes, works with async operations
 */

/**
 * Fast cleanup using TRUNCATE CASCADE
 * Call this in afterEach instead of slow individual deletes
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // TRUNCATE CASCADE is much faster than individual deletes
    // and handles foreign key constraints automatically
    await sql`TRUNCATE TABLE players, games, users RESTART IDENTITY CASCADE`.execute(db);
  } catch (error) {
    console.warn('Truncate failed, falling back to deletes:', error);
    // Fallback to individual deletes if truncate fails
    await db.deleteFrom("players").execute();
    await db.deleteFrom("games").execute();
    await db.deleteFrom("users").execute();
  }
}

/**
 * Get the database instance
 */
export function getTestDb() {
  return db;
}
