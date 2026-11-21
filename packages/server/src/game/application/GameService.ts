import { asSeat, createMove, Game, GameEvent, GameId, Player, Seat, UserId } from "@santorini/engine";
import type { GameView, MoveCommand } from "@santorini/shared";

import { GameNotFoundError, PlayerAlreadyInGameError, PlayerNotInGameError } from "@/errors/GameErrors.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import logger from "@/logger.ts";

import { GameBroadcaster } from "./GameBroadcaster.ts";
import { GameViewBuilder } from "./GameViewBuilder.ts";

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

  /** Runs a command on one game while holding its lock, then tells everyone who watches the game. */
  private async update(
    gameId: GameId,
    change: (game: Game) => GameEvent[],
  ): Promise<{ game: Game; events: GameEvent[] }> {
    const result = await this.gameRepository.update(gameId, change);
    if (!result) {
      throw new GameNotFoundError(gameId);
    }

    this.gameBroadcaster.broadcastGameUpdate(result.game);
    return result;
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
      const seat = this.seatOf(game, userId);
      if (seat === null) {
        throw new PlayerNotInGameError(gameId, userId);
      }

      logger.debug(`Move validation: userId=${userId}, seat=${seat}, currentSeat=${game.currentSeat}`);

      const move = createMove(seat, moveCommand);
      const events = game.applyMove(seat, move);

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
      if (game.players.some((player) => player.userId === userId)) {
        throw new PlayerAlreadyInGameError(gameId, userId);
      }

      return game.addPlayer(new Player(userId));
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
      const seat = this.seatOf(game, userId);
      if (seat === null) {
        throw new PlayerNotInGameError(gameId, userId);
      }

      return game.setPlayerReady(seat, ready);
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

  private seatOf(game: Game, userId: UserId): Seat | null {
    const seat = game.players.findIndex((player) => player.userId === userId);
    return seat === -1 ? null : asSeat(seat);
  }
}
