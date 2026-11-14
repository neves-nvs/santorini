import * as helpers from "../helper/helpers.ts";
import { server, wss } from "../../../src/main.ts";
import { WS_MESSAGE_TYPES } from "../../../../shared/src/websocket-types.ts";
import WebSocket from "ws";
import { cleanupTestData } from "../helper/testDb.ts";
import { config } from "../../../src/configs/config.ts";
import { db } from "../../../src/database.ts";

interface Message {
  type: string;
  payload?: { gameId?: number };
}

async function connect(token: string): Promise<{ ws: WebSocket; messages: Message[] }> {
  const ws = new WebSocket(`ws://localhost:${config.port}`, {
    headers: { Authorization: `Bearer ${token}` },
    perMessageDeflate: false,
  });
  const messages: Message[] = [];
  ws.on("message", (data) => messages.push(JSON.parse(data.toString())));
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  return { ws, messages };
}

async function waitFor(messages: Message[], type: string): Promise<Message> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const message = messages.find((m) => m.type === type);
    if (message) return message;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timeout waiting for ${type}`);
}

describe("Rejected Join Integration Tests", () => {
  const sockets: WebSocket[] = [];

  afterEach(async () => {
    sockets.forEach((ws) => ws.close());
    sockets.length = 0;
    await cleanupTestData();
  });

  afterAll(async () => {
    wss.close();
    server.close();
    await db.destroy();
  });

  test("a player who is refused a place in a full game receives nothing from it", async () => {
    const [owner, guest, outsider] = await Promise.all([
      helpers.createTestUserWithLogin(),
      helpers.createTestUserWithLogin(),
      helpers.createTestUserWithLogin(),
    ]);
    const gameId = await helpers.createTestGame(owner.token);
    const ownerConnection = await connect(owner.token);
    const guestConnection = await connect(guest.token);
    const outsiderConnection = await connect(outsider.token);
    sockets.push(ownerConnection.ws, guestConnection.ws, outsiderConnection.ws);
    const join = (ws: WebSocket) => ws.send(JSON.stringify({ type: WS_MESSAGE_TYPES.JOIN_GAME, payload: { gameId } }));

    join(ownerConnection.ws);
    await waitFor(ownerConnection.messages, WS_MESSAGE_TYPES.GAME_JOINED);
    join(guestConnection.ws);
    await waitFor(guestConnection.messages, WS_MESSAGE_TYPES.GAME_JOINED);

    join(outsiderConnection.ws);
    await waitFor(outsiderConnection.messages, WS_MESSAGE_TYPES.ERROR);

    guestConnection.ws.send(JSON.stringify({ type: WS_MESSAGE_TYPES.LEAVE_GAME, payload: { gameId } }));
    await waitFor(ownerConnection.messages, WS_MESSAGE_TYPES.PLAYER_LEFT);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(outsiderConnection.messages.map((m) => m.type)).toEqual([WS_MESSAGE_TYPES.ERROR]);
  }, 15000);
});
