import request from "supertest";
import WebSocket from "ws";

import { app } from "@/app.ts";
import { config } from "@/configs/config.ts";
import { db } from "@/database.ts";
import { server, wss } from "@/main.ts";
import { createTestUserWithLogin } from "@tests/integration/helper/helpers.ts";

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

async function requestTicket(): Promise<string> {
  const response = await request(app).post("/ws-ticket").set("Cookie", `token=${jwtToken}`).expect(200);
  return response.body.ticket;
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

    test("rejects a connection that has only the session cookie", async () => {
      const ws = new WebSocket(`ws://localhost:${config.port}`, {
        headers: { Cookie: `token=${jwtToken}` },
        perMessageDeflate: false,
      });

      await expectConnectionRejected(ws);
    });

    test("authenticates WebSocket connection with a ticket", async () => {
      const ticket = await requestTicket();

      await expectConnectionAccepted(new WebSocket(`ws://localhost:${config.port}/?ticket=${ticket}`));
    });

    test("accepts a ticket only once", async () => {
      const ticket = await requestTicket();
      await expectConnectionAccepted(new WebSocket(`ws://localhost:${config.port}/?ticket=${ticket}`));

      await expectConnectionRejected(new WebSocket(`ws://localhost:${config.port}/?ticket=${ticket}`));
    });

    test("rejects a ticket that was never issued", async () => {
      await expectConnectionRejected(new WebSocket(`ws://localhost:${config.port}/?ticket=made-up`));
    });

    test("only a logged-in user can get a ticket", async () => {
      await request(app).post("/ws-ticket").expect(401);
    });

    test("rejects a valid JWT passed in the query string", async () => {
      const ws = new WebSocket(`ws://localhost:${config.port}/?token=${jwtToken}`);

      await expectConnectionRejected(ws);
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
