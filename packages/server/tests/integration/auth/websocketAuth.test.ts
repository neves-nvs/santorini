import { server, wss } from "../../../src/main";

import { PORT } from "../../../src/configs/config";
import WebSocket from "ws";
import { createTestUserWithLogin } from "../helper/helpers";
import { db } from "../../../src/database";
import logger from "../../../src/logger";

let jwtToken: string;

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
    test("should authenticate WebSocket connection with valid JWT", (done) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
        perMessageDeflate: false,
      });

      ws.on("open", () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on("error", (err) => {
        logger.error("WebSocket error: ", err);
        done(new Error(`WebSocket connection failed: ${err}`));
      });
    });

    test("should reject WebSocket connection with invalid JWT", (done) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`, {
        headers: {
          Authorization: `Bearer invalidToken`,
        },
      });

      ws.on("error", (err) => {
        expect(err).toBeTruthy();
        expect(ws.readyState).toBe(WebSocket.CLOSING);
        ws.close();
        done();
      });

      ws.on("close", () => {
        expect(ws.readyState).toBe(WebSocket.CLOSED);
      });
    });

    test("should reject the WebSocket connection when no JWT token is provided", (done) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`);

      ws.once("error", (err) => {
        expect(err).toBeTruthy();
        expect(ws.readyState).toBe(WebSocket.CLOSING);
        ws.close();
        done();
      });

      ws.once("close", () => {
        expect(ws.readyState).toBe(WebSocket.CLOSED);
      });
    });
  });
});