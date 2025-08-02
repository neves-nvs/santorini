import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('players')
    .addColumn('is_ready', 'boolean', (col) => col.defaultTo(false).notNull())
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('players')
    .dropColumn('is_ready')
    .execute()
}
