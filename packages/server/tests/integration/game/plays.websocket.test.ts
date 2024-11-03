import * as helpers from "../helper/helpers";

import { server, wss } from "../../../src/main";

import { PORT } from "../../../src/configs/config";
import { UserDTO } from "../../../src/users/userDTO";
import WebSocket from "ws";
import { db } from "../../../src/database";

let user: UserDTO;
let jwtToken: string;
let ws: WebSocket;
let gameId: number;

describe("WebSocket Message Reception Tests", () => {
  beforeEach(async () => {
    const createUserResponse = await helpers.createTestUserWithLogin();
    user = createUserResponse.user;
    jwtToken = createUserResponse.token;

    ws = new WebSocket(`ws://localhost:${PORT}`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
      perMessageDeflate: false,
    });

    gameId = await helpers.createTestGame(jwtToken);
  });

  afterEach(async () => {
    await db.deleteFrom("players").execute();
    await db.deleteFrom("games").execute();
    await db.deleteFrom("users").execute();
    ws.close();
  });

  afterAll(async () => {
    wss.close();
    server.close();
    await db.destroy();
  });

  describe("WebSocket Messaging", () => {
    test("receives updated player list as players join game", async () => {
      const subscribe_game_message = {
        type: "subscribe_game",
        payload: { gameId: gameId, username: user.username },
      };

      await new Promise<void>((resolve, reject) => {
        ws.on("open", () => {
          expect(ws.readyState).toBe(WebSocket.OPEN);

          expect(user).toBeDefined();
          expect(user.username).toBeDefined();

          ws.send(JSON.stringify(subscribe_game_message));
          resolve();
        });
        ws.on("error", (err) => {
          reject(new Error(`WebSocket connection failed: ${err}`));
        });
      });

      const wsMessagePromise = new Promise<void>((resolve, reject) => {
        function onMessage(data: WebSocket.RawData) {
          const rawMessage = typeof data === "string" ? data : data.toString();
          const message = JSON.parse(rawMessage);

          if (message.type === "game_start") {
            ws.close();
            resolve();
          }

          if (message.type === "players_in_game") {
            // expect(message.message).toContainEqual(expect.objectContaining({ username: user.username }));
            // expect(message.message).toContainEqual(expect.objectContaining({ username: "user2" }));
            ws.close();
            resolve();
          }
        }

        ws.on("message", onMessage);

        ws.on("error", (err) => {
          reject(new Error(`WebSocket error: ${err}`));
        });
      });

      const { token: user2Token } = await helpers.createTestUserWithLogin();
      await helpers.addTestPlayerToGame(gameId, user2Token);

      await wsMessagePromise;
    });
  });
});
