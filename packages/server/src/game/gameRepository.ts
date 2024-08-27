import { Game } from "./game";

const games: Game[] = [];

export async function findGameById(gameId: string) {
  return games.find((game) => game.getId() === gameId);
}

export async function createGame({
  amountOfPlayers,
  username,
}: {
  amountOfPlayers: number | undefined;
  username: string;
}) {
  const game = new Game({ amountOfPlayers });
  games.push(game);
  return game;
}

export async function getAllGameIds() {
  return games.map((game) => game.getId());
}
