import { Database, Game, GameStatus } from '../../model';

import { Kysely } from 'kysely';
import { db } from '../../database';
import logger from '../../logger';

/**
 * Database adapter for lobby operations
 * Handles game listing, searching, and basic CRUD operations
 */
export class LobbyRepositoryDb {
  constructor(private database: Kysely<Database> = db) {}

  /**
   * Find all games with basic information
   */
  async findAllGames(): Promise<Game[]> {
    logger.debug('Loading all games from database');
    
    return this.database
      .selectFrom('games')
      .selectAll()
      .orderBy('id', 'desc')
      .execute();
  }

  /**
   * Find games by status
   */
  async findGamesByStatus(status: string): Promise<Game[]> {
    logger.debug(`Loading games with status: ${status}`);

    return this.database
      .selectFrom('games')
      .where('game_status', '=', status as GameStatus)
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();
  }

  /**
   * Find games that are waiting for players
   */
  async findAvailableGames(): Promise<Game[]> {
    logger.debug('Loading available games');

    return this.database
      .selectFrom('games')
      .where('game_status', '=', 'waiting')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();
  }

  /**
   * Get game count by status
   */
  async getGameCountByStatus(status: string): Promise<number> {
    const result = await this.database
      .selectFrom('games')
      .where('game_status', '=', status as GameStatus)
      .select(({ fn }) => [fn.count<number>('id').as('count')])
      .executeTakeFirst();

    return result?.count || 0;
  }

  /**
   * Find games created by a specific user
   */
  async findGamesByCreator(creatorId: number): Promise<Game[]> {
    logger.debug(`Loading games created by user ${creatorId}`);

    return this.database
      .selectFrom('games')
      .where('user_creator_id', '=', creatorId)
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();
  }

  /**
   * Find games where a user is a player
   */
  async findGamesByPlayer(userId: number): Promise<Game[]> {
    logger.debug(`Loading games for player ${userId}`);
    
    return this.database
      .selectFrom('games')
      .innerJoin('players', 'games.id', 'players.game_id')
      .where('players.user_id', '=', userId)
      .selectAll('games')
      .orderBy('games.created_at', 'desc')
      .execute();
  }
}
