import {
  ConcurrentUpdateError,
  GameNotFoundError,
  PlayerAlreadyInGameError,
  PlayerNotInGameError,
} from "@/errors/GameErrors.ts";
import { Game, GameEvent, GameId, Player, PlayerId, UserId, createMove } from "@santorini/engine";
import type { GameView, MoveCommand } from "@santorini/shared";
import { GameBroadcaster } from "./GameBroadcaster.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { GameViewBuilder } from "./GameViewBuilder.ts";
import logger from "@/logger.ts";
import { playerIdSchema } from "@/idSchemas.ts";

const MAX_UPDATE_ATTEMPTS = 5;

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
   * Load a game, change it and save it. When another command saved the game in between, the command runs again
   * against the new state, so it is checked against what the game is now and not against what it was.
   */
  private async update(
    gameId: GameId,
    change: (game: Game) => GameEvent[],
  ): Promise<{ game: Game; events: GameEvent[] }> {
    for (let attempt = 1; ; attempt++) {
      const game = await this.gameRepository.findById(gameId);
      if (!game) {
        throw new GameNotFoundError(gameId);
      }

      const loadedVersion = game.version;
      const events = change(game);

      try {
        await this.gameRepository.save(game, loadedVersion);
      } catch (error) {
        if (error instanceof ConcurrentUpdateError && attempt < MAX_UPDATE_ATTEMPTS) {
          logger.debug(`Game ${gameId} changed while a command ran, trying again (attempt ${attempt})`);
          continue;
        }
        throw error;
      }

      this.gameBroadcaster.broadcastGameUpdate(game);
      return { game, events };
    }
  }

  /**
   * Apply a move to a game
   */
  async applyMove(
    gameId: GameId,
    userId: UserId,
    moveCommand: MoveCommand,
  ): Promise<{ game: Game; events: GameEvent[] }> {
    logger.info(`Processing move for game ${gameId}, user ${userId}:`, moveCommand);

    const result = await this.update(gameId, (game) => {
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
        events.push(...game.checkAndHandleNoMoves());
      }
      return events;
    });

    logger.info(`Move processed successfully for game ${gameId}, generated ${result.events.length} events`);
    return result;
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

    const result = await this.update(gameId, (game) => {
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

      // Add player to game
      return game.addPlayer(new Player(playerId, userId, seat));
    });

    logger.info(`Player ${userId} added to game ${gameId}`);
    return result;
  }

  /**
   * Remove a player from a game.
   * Only allowed if game is in 'waiting' status and player hasn't readied.
   */
  async removePlayer(gameId: GameId, userId: UserId): Promise<{ game: Game; events: GameEvent[] }> {
    logger.info(`Removing player ${userId} from game ${gameId}`);

    const result = await this.update(gameId, (game) => game.removePlayer(userId));

    logger.info(`Player ${userId} removed from game ${gameId}`);
    return result;
  }

  /**
   * Set player ready status.
   * Domain auto-starts game when all players are ready.
   */
  async setPlayerReady(gameId: GameId, userId: UserId, ready: boolean): Promise<{ game: Game; events: GameEvent[] }> {
    logger.info(`Setting player ${userId} ready status to ${ready} for game ${gameId}`);

    return this.update(gameId, (game) => {
      const playerId = this.findPlayerIdByUserId(game, userId);
      if (!playerId) {
        throw new PlayerNotInGameError(gameId, userId);
      }

      return game.setPlayerReady(playerId, ready);
    });
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
