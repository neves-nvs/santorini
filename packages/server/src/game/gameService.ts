import * as gameRepository from "./gameRepository";

import { NewGame, User } from "../model";
import { broadcastUpdate } from "./gameSession";
import { db } from "../database";
import logger from "../logger";

export async function createGame(user: User, amountOfPlayers: number = 2): Promise<{ gameId: number }> {
  const newGame = {
    created_at: new Date().toISOString(),
    user_creator_id: user.id,
    player_count: amountOfPlayers,
    game_status: "waiting",
    game_phase: "placing",
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
      if (playersInGame.length >= game.player_count) {
        logger.error("Game is full");
        throw new Error("Game is full");
      }

      await gameRepository.addPlayerToGame(gameId, user.id, transaction);

      const playersCount = (await gameRepository.findPlayersByGameId(gameId, transaction)).length;
      logger.info(`Game ${gameId} now has ${playersCount}/${game.player_count} players`);
      logger.info(`Game ${gameId} status check: playersCount=${playersCount}, game.player_count=${game.player_count}, current_status=${game.game_status}`);

      if (playersCount === game.player_count) {
        logger.info(`Game ${gameId} is full! Setting to ready for confirmation...`);

        // Update game status to ready (waiting for confirmations)
        await gameRepository.updateGame(gameId, { game_status: "ready" });

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
    const playersReadyStatus = gameSession.getPlayersReadyStatus(gameId);
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
    const messageHandler = await import("../websockets/messageHandler");
    const formattedGameState = await messageHandler.formatGameStateForFrontend(updatedGame, gameId);

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
