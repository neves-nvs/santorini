import { Game } from "@santorini/engine";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import logger from "@/logger.ts";
import { sanitizeForLog } from "@/logSanitizer.ts";

/**
 * Application service for lobby operations
 * Handles game creation, joining, and lobby management
 */
export class LobbyService {
  constructor(private gameRepository: GameRepositoryDb) {}

  /**
   * Create a new game
   */
  async createGame(creatorId: number, maxPlayers: number = 2): Promise<Game> {
    logger.info(`Creating new game for user ${sanitizeForLog(creatorId)}, max players: ${sanitizeForLog(maxPlayers)}`);

    // Let the repository generate the ID and create the game
    const game = await this.gameRepository.createNew(creatorId, maxPlayers);

    logger.info(`Game ${game.id} created successfully`);
    return game;
  }

  /**
   * Find available games to join
   */
  async findAvailableGames(): Promise<Game[]> {
    logger.info("Finding available games");

    const games = await this.gameRepository.findByStatus("waiting");

    logger.info(`Found ${games.length} available games`);
    return games;
  }

  /**
   * Get all games (for admin/debugging)
   */
  async getAllGames(): Promise<Game[]> {
    logger.info("Getting all games");
    return this.gameRepository.findAll();
  }

  /**
   * Find games where the user is a player (any status - waiting, in_progress, finished)
   */
  async findMyGames(userId: number): Promise<Game[]> {
    logger.info(`Finding games for user ${userId}`);

    const games = await this.gameRepository.findByPlayer(userId);

    logger.info(`Found ${games.length} games for user ${userId}`);
    return games;
  }

  /**
   * Find a specific game by ID
   */
  async findGame(gameId: number): Promise<Game | null> {
    logger.info(`Finding game ${gameId}`);
    return this.gameRepository.findById(gameId);
  }

  /**
   * Delete a game (admin operation)
   */
  async deleteGame(gameId: number): Promise<void> {
    logger.info(`Deleting game ${gameId}`);
    await this.gameRepository.delete(gameId);
  }
}
