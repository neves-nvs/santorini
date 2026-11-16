import { Game, GameEvent, GameId, Player, PlayerId, UserId, createMove } from "@santorini/engine";
import { GameNotFoundError, PlayerAlreadyInGameError, PlayerNotInGameError } from "@/errors/GameErrors.ts";
import type { GameView, MoveCommand } from "@santorini/shared";
import { GameBroadcaster } from "./GameBroadcaster.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { GameViewBuilder } from "./GameViewBuilder.ts";
import logger from "@/logger.ts";
import { playerIdSchema } from "@/idSchemas.ts";

/**
 * Application service for game operations
 * Orchestrates domain operations and coordinates with infrastructure
 */
export class GameService {
  constructor(
    private gameRepository: GameRepositoryDb,
    private gameViewBuilder: GameViewBuilder = new GameViewBuilder(),
    private gameBroadcaster: GameBroadcaster = new GameBroadcaster(),
  ) {}

  /**
   * Apply a move to a game
   */
  async applyMove(
    gameId: GameId,
    userId: UserId,
    moveCommand: MoveCommand,
  ): Promise<{ game: Game; events: GameEvent[] }> {
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

    logger.debug(`Move validation: userId=${userId}, playerId=${playerId}, currentPlayerId=${game.currentPlayerId}`);

    // Create domain move object (playerId from authenticated user)
    const move = createMove(playerId, moveCommand);

    // Apply move to domain aggregate
    const events = game.applyMove(playerId, move);

    // Check if next player is trapped (no valid moves) - only on their turn start
    if (game.status === "in-progress" && game.phase === "moving") {
      const trappedEvents = game.checkAndHandleNoMoves();
      events.push(...trappedEvents);
    }

    // Persist updated game state
    await this.gameRepository.save(game);

    this.gameBroadcaster.broadcastGameUpdate(game);

    logger.info(`Move processed successfully for game ${gameId}, generated ${events.length} events`);
    return { game, events };
  }

  /**
   * Get a game by ID
   */
  async getGame(gameId: GameId): Promise<Game | null> {
    return this.gameRepository.findById(gameId);
  }

  /**
   * Add a player to a game
   */
  async addPlayer(gameId: GameId, userId: UserId): Promise<{ game: Game; events: GameEvent[] }> {
    logger.info(`Adding player ${userId} to game ${gameId}`);

    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    // Check if player already in game
    for (const player of game.players.values()) {
      if (player.userId === userId) {
        throw new PlayerAlreadyInGameError(gameId, userId);
      }
    }

    // Create player domain object
    // PlayerId is 1-indexed based on join order
    const playerId = playerIdSchema.parse(game.players.size + 1);
    const seat = game.players.size;
    const player = new Player(playerId, userId, seat);

    // Add player to game
    const events = game.addPlayer(player);

    // Persist updated game state
    await this.gameRepository.save(game);
    this.gameBroadcaster.broadcastGameUpdate(game);

    logger.info(`Player ${userId} added to game ${gameId}`);
    return { game, events };
  }

  /**
   * Remove a player from a game.
   * Only allowed if game is in 'waiting' status and player hasn't readied.
   */
  async removePlayer(gameId: GameId, userId: UserId): Promise<{ game: Game; events: GameEvent[] }> {
    logger.info(`Removing player ${userId} from game ${gameId}`);

    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    const events = game.removePlayer(userId);

    await this.gameRepository.save(game);
    this.gameBroadcaster.broadcastGameUpdate(game);

    logger.info(`Player ${userId} removed from game ${gameId}`);
    return { game, events };
  }

  /**
   * Set player ready status.
   * Domain auto-starts game when all players are ready.
   */
  async setPlayerReady(gameId: GameId, userId: UserId, ready: boolean): Promise<{ game: Game; events: GameEvent[] }> {
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

    this.gameBroadcaster.broadcastGameUpdate(game);

    return { game, events };
  }

  /**
   * The game as this user sees it
   */
  async getGameView(gameId: GameId, userId: UserId): Promise<GameView> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new GameNotFoundError(gameId);
    }

    return this.gameViewBuilder.buildFor(game, userId);
  }

  /**
   * Helper to find player ID by user ID
   */
  private findPlayerIdByUserId(game: Game, userId: UserId): PlayerId | null {
    for (const [playerId, player] of game.players) {
      if (player.userId === userId) {
        return playerId;
      }
    }
    return null;
  }
}
