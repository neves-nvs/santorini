import { updatePlayersList, updatePlaysList } from "../UI/functions";

import GameManager from "../view/GameManager";

export type Message = {
  type: string;
  payload: any;
};

export default class NetworkManager implements GameController {
  private gameManager: GameManager;
  private socket: WebSocket;
  private serverAddress = "ws://localhost:8081";
  private httpBaseUrl = "http://localhost:8081";

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;

    this.socket = new WebSocket(this.serverAddress);

    this.socket.onopen = () => {
      console.log("Connected to WebSocket.");
    };

    this.socket.onmessage = event => {
      const message = JSON.parse(event.data);
      const { type, payload } = message;
      console.log(message);

      switch (type) {
        case "joined_game":
          this.handleJoinedGame(payload);
          break;

        case "current_players":
          this.listPlayers(payload);
          break;

        case "available_plays":
          this.updateAvailablePlays(payload);
          break;

        default:
          console.warn("Unknown message type:", message.type);
      }
    };

    this.socket.onclose = () => {
      console.log("Disconnected from the server.");
    };
  }

  private sendMessage(type: string, payload: any) {
    this.socket.send(JSON.stringify({ type, payload }));
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Incoming                                  */
  /* -------------------------------------------------------------------------- */

  private handleJoinedGame(gameState: any) {
    console.log("Joined game:", gameState);
    // Update the game state using gameManager
  }

  private listPlayers(players: string[]) {
    updatePlayersList({ players });
  }

  private updateAvailablePlays(plays: any) {
    console.warn(plays)
    updatePlaysList({ plays });
  }


  /* -------------------------------------------------------------------------- */
  /*                                  Outgoing                                  */
  /* -------------------------------------------------------------------------- */

  subscribeToGame(gameId: string, username: string) {
    this.sendMessage("subscribe_game", { gameId, username });
  }

  placeWorker(x: number, y: number) {
    this.gameManager.placeWorker(x, y);
  }

  moveWorker(xFrom: number, yFrom: number, xTo: number, yTo: number) {
    this.gameManager.moveWorker({ x: xFrom, y: yFrom }, { x: xTo, y: yTo });
  }

  buildBlock(x: number, y: number, type: string) {
    this.gameManager.buildBlock({ x, y }, "BASE");
  }

  /* -------------------------------------------------------------------------- */
  /*                                   /games                                   */
  /* -------------------------------------------------------------------------- */

  async getGames(): Promise<string[]> {
    const response = await fetch(`${this.httpBaseUrl}/games`);
    if (!response.ok) {
      throw new Error("Failed to fetch games");
    }
    return response.json();
  }

  async getPlayersInGame(gameId: string): Promise<string[]> {
    const response = await fetch(`${this.httpBaseUrl}/games/${gameId}/players`);
    if (!response.ok) {
      throw new Error("Failed to fetch players in game");
    }
    return response.json();
  }

  async createGame(amountOfPlayers: number, username: string) {
    const response = await fetch(`${this.httpBaseUrl}/games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amountOfPlayers, username }),
    });

    if (!response.ok) {
      throw new Error("Failed to create game");
    }
  }


  async joinGame(username: string, gameID: string): Promise<boolean> {
    const response = await fetch(`${this.httpBaseUrl}/games/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, gameID }),
    });

    if (!response.ok) {
      return false;
    }
    return true;
  }


  /* -------------------------------------------------------------------------- */
  /*                               Authentication                               */
  /* -------------------------------------------------------------------------- */

  async createUser(username: string): Promise<boolean> {
    const response = await fetch(`${this.httpBaseUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      return false;
    }

    return true;
  }

  async login(username: string) {
    const response = await fetch(`${this.httpBaseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: username }),
    });

    // console.log(response);
    if (!response.ok) {
      return false;
    }

    return true;
  }


}
