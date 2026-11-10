import { server, wss } from "../../../src/main";

import { PORT } from "../../../src/configs/config";
import WebSocket from "ws";
import { createTestUserWithLogin } from "../helper/helpers";
import { db } from "../../../src/database";

let jwtToken: string;

function expectConnectionRejected(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once("error", (err) => {
      try {
        expect(err).toBeTruthy();
        expect(ws.readyState).toBe(WebSocket.CLOSING);
      } catch (assertion) {
        reject(assertion);
      }
    });

    ws.once("close", () => {
      try {
        expect(ws.readyState).toBe(WebSocket.CLOSED);
        resolve();
      } catch (assertion) {
        reject(assertion);
      }
    });
  });
}

describe("WebSocket Authentication Integration Tests", () => {
  beforeEach(async () => {
    jwtToken = (await createTestUserWithLogin()).token;
  });

  afterEach(async () => {
    await db.deleteFrom("players").execute();
    await db.deleteFrom("games").execute();
    await db.deleteFrom("users").execute();
  });

  afterAll(async () => {
    wss.close();
    server.close();
    await db.destroy();
  });

  describe("WebSocket Authentication", () => {
    test("authenticates WebSocket connection with valid JWT", async () => {
      const ws = new WebSocket(`ws://localhost:${PORT}`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
        perMessageDeflate: false,
      });

      await new Promise<void>((resolve, reject) => {
        ws.on("open", () => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          ws.close();
          resolve();
        });

        ws.on("error", (err) => {
          reject(new Error(`WebSocket connection failed: ${err}`));
        });
      });
    });

    test("rejects connection for invalid JWT", async () => {
      const ws = new WebSocket(`ws://localhost:${PORT}`, {
        headers: {
          Authorization: `Bearer invalidToken`,
        },
      });

      await expectConnectionRejected(ws);
    });

    test("rejects connection when JWT token is missing", async () => {
      const ws = new WebSocket(`ws://localhost:${PORT}`);

      await expectConnectionRejected(ws);
    });
  });
});
