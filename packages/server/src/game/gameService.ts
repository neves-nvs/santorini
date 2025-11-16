import * as gameRepository from "./gameRepository";

import { NewGame, User } from "../model";
import { broadcastUpdate } from "./gameSession";
import { db } from "../database";
import logger from "../logger";

// Santorini is a 2-player game
const SANTORINI_MAX_PLAYERS = 2;

export async function createGame(user: User, maxPlayers: number = SANTORINI_MAX_PLAYERS): Promise<{ gameId: number }> {
  const newGame = {
    created_at: new Date().toISOString(),
    user_creator_id: user.id,
    player_count: maxPlayers, // Set the game capacity
    game_status: "waiting",
    game_phase: null, // No phase until game starts
  } as NewGame;

  const game = await gameRepository.createGame(newGame);

  return { gameId: game.id };
}

export async function addPlayerToGame(gameId: number, user: User): Promise<void> {
  let shouldBroadcast = false;

  await db
    .transaction()
    .setIsolationLevel("serializable")
    .execute(async (transaction) => {
      const game = await gameRepository.findGameById(gameId, transaction);
      if (!game) {
        throw new Error("Game not found");
      }

      const playersInGame = await gameRepository.findPlayersByGameId(gameId, transaction);

      // Check if player is already in the game
      if (playersInGame.includes(user.id)) {
        logger.info(`Player ${user.id} already in game ${gameId}, skipping add`);
        return;
      }

      if (playersInGame.length >= game.player_count) {
        logger.error("Game is full");
        throw new Error("Game is full");
      }

      await gameRepository.addPlayerToGame(gameId, user.id, transaction);

      const playersCount = (await gameRepository.findPlayersByGameId(gameId, transaction)).length;
      logger.info(`Game ${gameId} now has ${playersCount}/${game.player_count} players`);
      logger.info(`Game ${gameId} status check: playersCount=${playersCount}, maxPlayers=${game.player_count}, current_status=${game.game_status}`);

      if (playersCount === game.player_count) {
        logger.info(`Game ${gameId} is full! Players can now ready up...`);

        // Game stays in "waiting" status - players will ready up, then it moves to "in-progress"
        // Mark that we should broadcast after transaction commits
        shouldBroadcast = true;
      }
    });

  // Broadcast AFTER transaction is committed so all queries see the updated data
  if (shouldBroadcast) {
    logger.info(`Broadcasting game_ready_for_start for game ${gameId}`);
    broadcastUpdate(gameId, { type: "game_ready_for_start" });

    // Send updated game state with enhanced ready status
    const updatedGame = await gameRepository.findGameById(gameId);
    const players = await gameRepository.findPlayersByGameId(gameId);

    // Get enhanced ready status with usernames
    const usersInGame = await gameRepository.findUsersByGame(gameId);
    const gameSession = await import("./gameSession");
    const playersReadyStatus = await gameSession.getPlayersReadyStatus(gameId);
    const enhancedReadyStatus = playersReadyStatus.map(status => {
      const userInfo = usersInGame.find(u => u.id === status.userId);
      return {
        ...status,
        username: userInfo?.username || 'Unknown',
        displayName: userInfo?.display_name || userInfo?.username || 'Unknown'
      };
    });

    logger.info(`Broadcasting game_state_update for game ${gameId} with status: ${updatedGame?.game_status} to ALL players`);

    // Use formatted game state instead of raw database object
    const gameStateService = await import("./gameStateService");
    const formattedGameState = await gameStateService.generateGameStateForFrontend(updatedGame, gameId);

    broadcastUpdate(gameId, {
      type: "game_state_update",
      payload: {
        ...formattedGameState,
        playersReadyStatus: enhancedReadyStatus
      }
    });
  }
}

export async function isReadyToStart(gameId: number): Promise<boolean> {
  const game = await gameRepository.findGameById(gameId);
  if (!game) {
    throw new Error("Game not found");
  }

  const playersInGame = await gameRepository.findPlayersByGameId(gameId);
  return playersInGame.length === game.player_count;
}
