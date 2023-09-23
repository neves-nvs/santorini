import { Socket, io } from "socket.io-client";
export default class NertworkManager {
  private socket: Socket;
  // let serverAddress = "http://localhost:3000";

  constructor(serverAddress: URL) {
    this.socket = io(serverAddress);
  }

  // socket.on("connection", () => { console.log("connected") })

  // socket.on("hello", () => { console.log("hello") })
}
