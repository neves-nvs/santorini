import { server, wss } from "../../../src/main";

import { PORT } from "../../../src/configs/config";
import WebSocket from "ws";
import { createUserWithLogin } from "../helper/helpers";
import { db } from "../../../src/database";
import logger from "../../../src/logger";

let jwtToken: string;

describe("WebSocket Authentication Integration Tests", () => {
  beforeEach(async () => {
    jwtToken = (await createUserWithLogin()).token;
    logger.info(`JWT token: ${jwtToken}`);
    logger.info(`"${jwtToken.replace("token=", "")}"`);
  });

  afterEach(async () => {
    await db.deleteFrom("users").execute();
  });

  afterAll(() => {
    wss.close();
    server.close();
    db.destroy();
  });

  describe("WebSocket Authentication", () => {
    test("should authenticate WebSocket connection with valid JWT", (done) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`, {
        headers: {
          Authorization: `Bearer ${jwtToken.replace("token=", "")}`,
        },
        perMessageDeflate: false,
      });

      ws.on("open", () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
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
        done();
      });

      ws.once("close", () => {
        expect(ws.readyState).toBe(WebSocket.CLOSED);
      });
    });
  });
});
