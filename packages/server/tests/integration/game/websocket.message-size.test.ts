import { server, wss } from "@/main.ts";
import WebSocket from "ws";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";
import { config } from "@/configs/config.ts";
import { createTestUserWithLogin } from "@tests/integration/helper/helpers.ts";
import { db } from "@/database.ts";

const TOO_BIG_CLOSE_CODE = 1009;

describe("WebSocket Message Size Integration Tests", () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    wss.close();
    server.close();
    await db.destroy();
  });

  test("closes the connection when a message is larger than the limit", async () => {
    const { token } = await createTestUserWithLogin();
    const ws = new WebSocket(`ws://localhost:${config.port}`, {
      headers: { Authorization: `Bearer ${token}` },
      perMessageDeflate: false,
    });
    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });

    const closed = new Promise<number>((resolve) => ws.once("close", resolve));
    ws.send("x".repeat(16 * 1024 + 1));

    expect(await closed).toBe(TOO_BIG_CLOSE_CODE);
  });
});
