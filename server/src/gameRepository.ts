import { Game } from "./game";

export const gameRepository: Game[] = [];

export function createGame() {
  const game = new Game();
  gameRepository.push(game);
  return game;
}

export function getGame(gameId: string) {
  return gameRepository.find(game => game.getId() === gameId);
}

export function getGamesIds() {
  return gameRepository.map(game => game.getId());
}

/* -------------------------------------------------------------------------- */
/*                                  GAMEPLAY                                  */
/* -------------------------------------------------------------------------- */

export function getMoves(gameId: string, playerId: string) {
  const game = getGame(gameId);
  if (!game) {
    return [];
  }
  // return game.getMoves(playerId);
}
