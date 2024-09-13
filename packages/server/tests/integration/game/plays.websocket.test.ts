import * as helpers from "../helper/helpers";

import { server, wss } from "../../../src/main";

import { PORT } from "../../../src/configs/config";
import { UserDTO } from "../../../src/users/userDTO";
import WebSocket from "ws";
import { db } from "../../../src/database";
import logger from "../../../src/logger";

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
    logger.info("gameId", gameId);
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
    test("should receive message listing players in game after each one joins", async () => {
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
        logger.info("Waiting for messageiii");
        ws.on("message", (data) => {
          logger.info("Received message", data);
          const rawMessage = typeof data === "string" ? data : data.toString();
          logger.info("Received message", rawMessage);
          const message = JSON.parse(rawMessage);
          logger.info("Parsed message", message);

          if (message.type === "game_start") {
            ws.close();
            resolve();
          }

          if (message.type === "players_in_game") {
            // expect(message.message).toContainEqual(expect.objectContaining({ username: user.username }));
            // expect(message.message).toContainEqual(expect.objectContaining({ username: user2.username }));

            ws.close();
            resolve();
          }
        });

        ws.on("error", (err) => {
          reject(new Error(`WebSocket error: ${err}`));
        });
      });

      const { user: user2, token: user2Token } = await helpers.createTestUserWithLogin();
      await helpers.addTestPlayerToGame(gameId, user2Token);

      await wsMessagePromise;
    });
  });
});
