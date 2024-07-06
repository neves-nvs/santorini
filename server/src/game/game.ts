import { Board, Position } from "../board/board";

import { User } from "../users/user";
import { Worker } from "../board/board";
import { randomUUID } from "crypto";

export type Play = {
  playerId: string;
  workerId: number;
  position: Position;
  extraPosition?: Position;
};

export type GamePhase = "NOT STARTED" | "SETUP" | "MOVE" | "BUILD" | "FINISHED";

export class Game {
  private id: string;
  private amountOfPlayers: number;

  private board: Board;

  private currentPlayer?: User;
  private players: User[];
  private gamePhase: string = "NOT STARTED";
  private workersByPlayer: Map<string, Worker[]> = new Map();

  private turnCount: number;

  constructor({ amountOfPlayers = 2 }) {
    this.id = randomUUID();
    this.amountOfPlayers = amountOfPlayers;
    this.board = new Board();
    this.players = [];
    this.currentPlayer = undefined;
    this.turnCount = 0;
  }

  getId() {
    return this.id;
  }

  addPlayer(user: User) {
    if (this.players.length >= this.amountOfPlayers) {
      throw new Error("Game is full");
    } else if (this.players.some(player => player.getUsername() === user.getUsername())) {
      // throw new Error("Player already in game");
      console.log("Player already in game");
    } else {
      this.players.push(user);
      console.log("Players now in game", this.players.map(player => player.getUsername()));
    }


    if (this.players.length === this.amountOfPlayers) {
      this.currentPlayer = user;
    }

  }

  start() {
    if (this.players.length !== this.amountOfPlayers) {
      return;
    }

    this.gamePhase = "SETUP";
    this.currentPlayer = this.players[0];
  }

  hasEnoughPlayers(): boolean {
    return this.players.length === this.amountOfPlayers;
  }

  getPlayers() {
    return this.players;
  }

  getPlays(playerId: string) {
    if (this.currentPlayer?.getUsername() !== playerId) {
      return [];
    }

    const plays: Play[] = [];
    if (this.gamePhase === "SETUP") {
      const emptySpots = this.board.getEmptyPositions();
      emptySpots.forEach(position => {
        plays.push({
          playerId: playerId,
          workerId: 1,
          position: position,
        });
      });
    } else if (this.gamePhase === "MOVE") {
      const player = this.currentPlayer;
    }
  }

  applyPlay(play: Play) {
    if (this.gamePhase === "SETUP") {
      const worker = new Worker(play.workerId, play.position);
      this.workersByPlayer.set(play.playerId, [worker]);
      this.switchTurn();
      if (
        this.players.every(
          player =>
            this.workersByPlayer.get(player.getUsername())?.length === 2,
        )
      ) {
        this.gamePhase = "MOVE";
      }
    } else if (this.gamePhase === "MOVE") {
      const worker = this.workersByPlayer
        .get(play.playerId)
        ?.find(worker => worker.getId() === play.workerId);
      if (!worker) {
        return;
      }

      worker.setPosition(play.position);
    } else if (this.gamePhase === "BUILD") {
      this.switchTurn();
    }
  }

  private switchTurn() {
    if (!this.currentPlayer) {
      return;
    }
    const currentPlayerIndex = this.players.indexOf(this.currentPlayer);
    const nextPlayerIndex = (currentPlayerIndex + 1) % this.players.length;
    this.currentPlayer = this.players[nextPlayerIndex];

    if (nextPlayerIndex === 0) {
      this.turnCount++;
    }
  }

  playerLeft(username: string) {
    if (this.gamePhase === "NOT STARTED") {
      this.players = this.players.filter(
        player => player.getUsername() !== username,
      );
    }
  }
}
