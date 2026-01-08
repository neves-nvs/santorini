import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add worker tracking fields to games table
  await db.schema
    .alterTable('games')
    .addColumn('last_moved_worker_id', 'integer')
    .addColumn('last_moved_worker_x', 'integer')
    .addColumn('last_moved_worker_y', 'integer')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove worker tracking fields from games table
  await db.schema
    .alterTable('games')
    .dropColumn('last_moved_worker_id')
    .dropColumn('last_moved_worker_x')
    .dropColumn('last_moved_worker_y')
    .execute();
}
