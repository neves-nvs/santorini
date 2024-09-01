import * as gameRepository from "./gameRepository";

import { NewGame, User } from "../model";
import { broadcastUpdate } from "./gameSession";

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
  const game = await gameRepository.findGameById(gameId);
  if (!game) {
    throw new Error("Game not found");
  }

  await gameRepository.addPlayerToGame(gameId, user.id);

  const playersCount = (await gameRepository.findPlayersByGameId(gameId)).length;
  if (playersCount === game.player_count) {
    broadcastUpdate(gameId, { type: "game_start" });
  }
}
