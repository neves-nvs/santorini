import { server, wss } from "../../../src/main.ts";
import WebSocket from "ws";
import { config } from "../../../src/configs/config.ts";
import { createTestUserWithLogin } from "../helper/helpers.ts";
import { db } from "../../../src/database.ts";

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

function expectConnectionAccepted(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once("open", () => {
      try {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        resolve();
      } catch (assertion) {
        reject(assertion);
      }
    });

    ws.once("error", (err) => {
      reject(new Error(`WebSocket connection failed: ${err}`));
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

  describe("WebSocket Origin", () => {
    function connectFrom(origin: string, extraHeaders: Record<string, string> = {}) {
      return new WebSocket(`ws://localhost:${config.port}`, {
        origin,
        headers: { Authorization: `Bearer ${jwtToken}`, ...extraHeaders },
        perMessageDeflate: false,
      });
    }

    test("rejects connection from an unknown origin", async () => {
      await expectConnectionRejected(connectFrom("https://evil.example"));
    });

    test("authenticates connection from an allowed origin", async () => {
      await expectConnectionAccepted(connectFrom("http://localhost:5174"));
    });

    test("authenticates connection from the same origin", async () => {
      await expectConnectionAccepted(connectFrom(`http://localhost:${config.port}`));
    });

    test("rejects connection from the same host with a different scheme", async () => {
      await expectConnectionRejected(connectFrom(`https://localhost:${config.port}`));
    });

    test("authenticates connection from the same host when the proxy forwarded https", async () => {
      await expectConnectionAccepted(connectFrom(`https://localhost:${config.port}`, { "X-Forwarded-Proto": "https" }));
    });
  });

  describe("WebSocket Authentication", () => {
    test("authenticates WebSocket connection with valid JWT", async () => {
      const ws = new WebSocket(`ws://localhost:${config.port}`, {
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
      const ws = new WebSocket(`ws://localhost:${config.port}`, {
        headers: {
          Authorization: `Bearer invalidToken`,
        },
      });

      await expectConnectionRejected(ws);
    });

    test("rejects connection when JWT token is missing", async () => {
      const ws = new WebSocket(`ws://localhost:${config.port}`);

      await expectConnectionRejected(ws);
    });
  });
});
