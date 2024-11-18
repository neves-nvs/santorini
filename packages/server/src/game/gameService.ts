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
      if (playersCount === game.player_count) {
        broadcastUpdate(gameId, { type: "game_start" });
      }
    });
}

export async function isReadyToStart(gameId: number): Promise<boolean> {
  const game = await gameRepository.findGameById(gameId);
  if (!game) {
    throw new Error("Game not found");
  }

  const playersInGame = await gameRepository.findPlayersByGameId(gameId);
  return playersInGame.length === game.player_count;
}
