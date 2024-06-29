import GameManager from "../view/GameManager";
import { updatePlayersList } from "../UI/functions";

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
        case "hello":
          console.log("Server says hello!");
          this.sendMessage("message", "hello from client");
          break;

        case "joined_game":
          this.handleJoinedGame(payload);
          break;

        case "current_players":
          this.listPlayers(payload);
          break;

        default:
          console.log("Unknown message type:", message.type);
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

  /* -------------------------------------------------------------------------- */
  /*                                  Outgoing                                  */
  /* -------------------------------------------------------------------------- */

  createGame(amountOfPlayers: number, username: string): void {
    this.sendMessage("create_game", { amountOfPlayers, username });
  }

  joinGame(username: string, gameId: string) {
    this.sendMessage("join_game", { username, gameId });
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
  /*                                  Endpoints                                 */
  /* -------------------------------------------------------------------------- */

  async getGames(): Promise<string[]> {
    const response = await fetch(`${this.httpBaseUrl}/games`);
    if (!response.ok) {
      throw new Error("Failed to fetch games");
    }
    return response.json();
  }

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

  // buildBlock(x: number, y: number) {
  //   this.gameManager.buildBlock({ x, y });
  // }
}
