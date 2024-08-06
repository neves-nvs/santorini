import { Game } from "../models";

export default class GameDTO {
  id: string;
  state: string;
  created_at: Date;
  constructor(game: Game) {
    this.id = game.id;
    this.state = game.state;
    this.created_at = game.created_at;
  }
}
