import { Game } from "./game";

export class gameRepository {
  private static games: Game[] = [];

  static createGame() {
    const game = new Game();
    this.games.push(game);
    return game;
  }

  static getGame(gameId: string) {
    return this.games.find(game => game.getId() === gameId);
  }

  static getGamesIds() {
    return this.games.map(game => game.getId());
  }
}

/* -------------------------------------------------------------------------- */
/*                                  GAMEPLAY                                  */
/* -------------------------------------------------------------------------- */
