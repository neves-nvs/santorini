import Player from "./Player";
import Play from "../common/messages";

export type GamePhase = "PLACE" | "MOVE" | "BUILD";

export type TurnPhase = "NOT_STARTED" | GamePhase | "FINISHED";

export default interface GameManager {
  turnPhase: TurnPhase;

  start(): void;

  addPlayer(player: Player): void;

  getPlays(): Play[];

  play(play: Play): void;
}
