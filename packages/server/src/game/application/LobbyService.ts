import { GameFullError, GameNotFoundError, PlayerAlreadyInGameError } from '../../errors/GameErrors';

import { Game } from '../domain/Game';
import { GameRepositoryDb } from '../infra/GameRepositoryDb';
import { Player } from '../domain/Player';
import logger from '../../logger';

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
    logger.info(`Creating new game for user ${creatorId}, max players: ${maxPlayers}`);

    // Let the repository generate the ID and create the game
    const game = await this.gameRepository.createNew(creatorId, maxPlayers);

    logger.info(`Game ${game.id} created successfully`);
    return game;
  }

  /**
   * Find available games to join
   */
  async findAvailableGames(): Promise<Game[]> {
    logger.info('Finding available games');
    
    const games = await this.gameRepository.findByStatus('waiting');
    
    logger.info(`Found ${games.length} available games`);
    return games;
  }

  /**
   * Get all games (for admin/debugging)
   */
  async getAllGames(): Promise<Game[]> {
    logger.info('Getting all games');
    return this.gameRepository.findAll();
  }

  /**
   * Find a specific game by ID
   */
  async findGame(gameId: number): Promise<Game | null> {
    logger.info(`Finding game ${gameId}`);
    return this.gameRepository.findById(gameId);
  }

  /**
   * Add a player to an existing game
   */
  async joinGame(gameId: number, userId: number): Promise<Game> {
    logger.info(`User ${userId} joining game ${gameId}`);

    // Load game
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    // Check if game is full
    if (game.players.size >= game.maxPlayers) {
      throw new GameFullError(gameId, game.players.size, game.maxPlayers);
    }

    // Check if player already in game
    for (const player of game.players.values()) {
      if (player.userId === userId) {
        throw new PlayerAlreadyInGameError(gameId, userId);
      }
    }

    // Add player to game
    const playerId = game.players.size + 1;
    const player = new Player(playerId, userId, game.players.size);
    game.addPlayer(player);

    // Save updated game
    await this.gameRepository.save(game);

    logger.info(`User ${userId} successfully joined game ${gameId}`);
    return game;
  }

  /**
   * Delete a game (admin operation)
   */
  async deleteGame(gameId: number): Promise<void> {
    logger.info(`Deleting game ${gameId}`);
    await this.gameRepository.delete(gameId);
  }
}
