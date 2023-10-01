import { Socket, io } from "socket.io-client";

export default class NertworkManager {
  private socket: Socket;
  private serverAddress = "http://localhost:3000";

  constructor() {
    this.socket = io(this.serverAddress);

    // Handle incoming messages from the server
    this.socket.on('message', (message) => {
      console.log(message)
      this.handleMessage(message);
    });

    // Handle connection events
    this.socket.on('connect', () => {
      console.log('Connected to the server.');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from the server.');
    });
  }

  // Send a message to the server
  public sendMessage(message) {
    this.socket.emit('message', message);
  }

  // Handle incoming messages from the server
  private handleMessage(message) {
    // Implement logic to process different types of messages received from the server
    // For example, handle player actions, game state updates, etc.
  }

  async validatePlayerAction(action: any): Promise<boolean> { // TODO change to sendActiontoSDerver | Test wether it needs to be async
    throw new Error("Method not implemented.");
  }
}