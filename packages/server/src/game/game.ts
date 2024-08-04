import { randomUUID } from "crypto";
import WebSocket from "ws";
import { Board, Position, Worker } from "../board/board";
import { User } from "../users/user";

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

  private connectionByPlayer: Map<string, WebSocket[]> = new Map();

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

  isReadyToStart(): boolean {
    return (
      this.players.length === this.amountOfPlayers &&
      this.gamePhase === "NOT STARTED"
    );
  }

  start() {
    this.currentPlayer = this.players[0];
    this.gamePhase = "SETUP";
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Players                                  */
  /* -------------------------------------------------------------------------- */

  getPlayers() {
    return this.players;
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  // TODO needs major refactor
  addPlayer(user: User) {
    const playerAlreadyInGame = this.players.some(
      (player) => player.getUsername() === user.getUsername(),
    );
    if (playerAlreadyInGame) {
      return true;
    }

    const gameAlreadyFull = this.players.length >= this.amountOfPlayers;
    if (gameAlreadyFull) {
      return false;
    }

    this.players.push(user);
    return true;
  }

  removePlayer(username: string) {
    if (this.gamePhase === "NOT STARTED") {
      this.players = this.players.filter(
        (player) => player.getUsername() !== username,
      );
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Gameplay                                  */
  /* -------------------------------------------------------------------------- */

  getPlays(playerId: string) {
    if (this.currentPlayer?.getUsername() !== playerId) {
      console.warn("Not your turn");
      return [];
    }
    const plays: Play[] = [];
    if (this.gamePhase === "SETUP") {
      console.log("SETUP");
      const emptySpots = this.board.getEmptyPositions();
      emptySpots.forEach((position) => {
        plays.push({
          playerId: playerId,
          workerId: 1,
          position: position,
        });
      });
    } else if (this.gamePhase === "MOVE") {
      // const player = this.currentPlayer;
    }

    return plays;
  }

  applyPlay(play: Play) {
    if (this.gamePhase === "SETUP") {
      const worker = new Worker(play.workerId, play.position);
      this.workersByPlayer.set(play.playerId, [worker]);
      this.switchTurn();
      if (
        this.players.every(
          (player) =>
            this.workersByPlayer.get(player.getUsername())?.length === 2,
        )
      ) {
        this.gamePhase = "MOVE";
      }
    } else if (this.gamePhase === "MOVE") {
      const worker = this.workersByPlayer
        .get(play.playerId)
        ?.find((worker) => worker.getId() === play.workerId);
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

  updatePlays(playerId: string) {
    const plays = this.getPlays(playerId);
    const connections = this.connectionByPlayer.get(playerId) || [];
    console.log("Updating plays for", playerId, plays);
    connections.forEach((connection) => {
      connection.send(
        JSON.stringify({
          type: "available_plays",
          payload: plays,
        }),
      );
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                                 Connections                                */
  /* -------------------------------------------------------------------------- */

  getConnections() {
    const connections: WebSocket[] = [];
    this.connectionByPlayer.forEach((playerConnections) => {
      connections.push(...playerConnections);
    });
    return connections;
  }

  getPlayerConnections(username: string) {
    const player = this.players.find(
      (player) => player.getUsername() === username,
    );
    if (!player) {
      return [];
    }
  }

  addConnection(username: string, ws: WebSocket) {
    const connections = this.connectionByPlayer.get(username) || [];
    connections.push(ws);
    this.connectionByPlayer.set(username, connections);
  }

  removeConnection(username: string, ws: WebSocket) {
    const connections = this.connectionByPlayer.get(username) || [];
    this.connectionByPlayer.set(
      username,
      connections.filter((connection) => connection !== ws),
    );
  }
}
