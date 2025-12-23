import { GameNotFoundError, PlayerNotInGameError } from '../../errors/GameErrors';
import { GameViewBuilder, PlayerGameView } from '../domain/GameViewBuilder';
import { MoveCommand, createMove } from '../domain/Move';

import { Game } from '../domain/Game';
import { GameBroadcaster } from './GameBroadcaster';
import { GameEvent } from '../domain/GameEvent';
import { GameRepositoryDb } from '../infra/GameRepositoryDb';
import { Player } from '../domain/Player';
import logger from '../../logger';

/**
 * Application service for game operations
 * Orchestrates domain operations and coordinates with infrastructure
 */
export class GameService {
  constructor(
    private gameRepository: GameRepositoryDb,
    private gameViewBuilder: GameViewBuilder = new GameViewBuilder(),
    private gameBroadcaster: GameBroadcaster = new GameBroadcaster()
  ) {}

  /**
   * Apply a move to a game
   */
  async applyMove(gameId: number, userId: number, moveCommand: MoveCommand): Promise<{ game: Game; events: GameEvent[]; view: PlayerGameView }> {
    logger.info(`Processing move for game ${gameId}, user ${userId}:`, moveCommand);

    // Load game from repository
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    // Find player ID for this user
    const playerId = this.findPlayerIdByUserId(game, userId);
    if (!playerId) {
      throw new PlayerNotInGameError(gameId, userId);
    }

    // Create domain move object (playerId from authenticated user)
    const move = createMove(playerId, moveCommand);

    // Apply move to domain aggregate
    const events = game.applyMove(playerId, move);

    // Check if next player is trapped (no valid moves) - only on their turn start
    if (game.status === 'in-progress' && game.phase === 'moving') {
      const trappedEvents = game.checkAndHandleNoMoves();
      events.push(...trappedEvents);
    }

    // Persist updated game state
    await this.gameRepository.save(game);

    // Broadcast the update to all players
    await this.gameBroadcaster.broadcastGameUpdate(game, events);

    // Build view for the player
    const view = this.gameViewBuilder.buildForPlayer(game, userId);

    logger.info(`Move processed successfully for game ${gameId}, generated ${events.length} events`);
    return { game, events, view };
  }

  /**
   * Add a player to a game
   */
  async addPlayer(gameId: number, userId: number): Promise<{ game: Game; events: GameEvent[] }> {
    logger.info(`Adding player ${userId} to game ${gameId}`);

    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    // Create player domain object
    const seat = game.players.size; // Simple seat assignment
    const player = new Player(game.players.size + 1, userId, seat);

    // Add player to game
    const events = game.addPlayer(player);

    // Persist updated game state
    await this.gameRepository.save(game);

    logger.info(`Player ${userId} added to game ${gameId}`);
    return { game, events };
  }

  /**
   * Remove a player from a game.
   * Only allowed if game is in 'waiting' status and player hasn't readied.
   */
  async removePlayer(gameId: number, userId: number): Promise<{ game: Game; events: GameEvent[] }> {
    logger.info(`Removing player ${userId} from game ${gameId}`);

    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    const events = game.removePlayer(userId);

    await this.gameRepository.save(game);

    logger.info(`Player ${userId} removed from game ${gameId}`);
    return { game, events };
  }

  /**
   * Set player ready status.
   * When all players confirm ready, game auto-starts.
   *
   * Flow:
   * 1. Players join a game via WebSocket connection
   * 2. Each player must confirm/accept the game (to verify opponents)
   * 3. Once ALL players have confirmed, the game auto-starts
   */
  async setPlayerReady(gameId: number, userId: number, ready: boolean): Promise<{ game: Game; events: GameEvent[] }> {
    logger.info(`Setting player ${userId} ready status to ${ready} for game ${gameId}`);

    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    const playerId = this.findPlayerIdByUserId(game, userId);
    if (!playerId) {
      throw new PlayerNotInGameError(gameId, userId);
    }

    const events = game.setPlayerReady(playerId, ready);
    await this.gameRepository.save(game);

    // Broadcast ready status update to all players
    await this.gameBroadcaster.broadcastGameUpdate(game, events);

    // If game started (all ready), broadcast game start
    if (game.status === 'in-progress') {
      await this.gameBroadcaster.broadcastGameStart(game);
      logger.info(`Game ${gameId} auto-started after all players confirmed ready`);
    }

    return { game, events };
  }

  /**
   * Start a game (manual start - typically not used, prefer setPlayerReady flow)
   */
  async startGame(gameId: number): Promise<{ game: Game; events: GameEvent[] }> {
    logger.info(`Starting game ${gameId}`);

    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    const events = game.startGame();
    await this.gameRepository.save(game);

    // Broadcast game start to all players
    await this.gameBroadcaster.broadcastGameStart(game);
    await this.gameBroadcaster.broadcastGameUpdate(game, events);

    logger.info(`Game ${gameId} started successfully`);
    return { game, events };
  }

  /**
   * Get game state for a specific player
   */
  async getGameStateForPlayer(gameId: number, userId: number): Promise<PlayerGameView> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    // Find player ID for this user
    const playerId = this.findPlayerIdByUserId(game, userId);

    // Generate available moves if it's the player's turn
    const availableMoves = playerId && game.currentPlayerId === playerId
      ? game.getAvailableMoves()
      : undefined;

    return this.gameViewBuilder.buildForPlayer(game, userId, availableMoves);
  }

  /**
   * Helper to find player ID by user ID
   */
  private findPlayerIdByUserId(game: Game, userId: number): number | null {
    for (const [playerId, player] of game.players) {
      if (player.userId === userId) {
        return playerId;
      }
    }
    return null;
  }
}
