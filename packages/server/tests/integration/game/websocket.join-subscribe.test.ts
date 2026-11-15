import * as helpers from "../helper/helpers.ts";
import { ServerMessage, ServerMessageOf, WS_MESSAGE_TYPES } from "../../../../shared/src/websocket-types.ts";
import { server, wss } from "../../../src/main.ts";
import WebSocket from "ws";
import { cleanupTestData } from "../helper/testDb.ts";
import { config } from "../../../src/configs/config.ts";
import { db } from "../../../src/database.ts";

interface Connection {
  ws: WebSocket;
  messages: ServerMessage[];
  send: (type: string, gameId: number) => void;
}

async function connect(token: string): Promise<Connection> {
  const ws = new WebSocket(`ws://localhost:${config.port}`, {
    headers: { Authorization: `Bearer ${token}` },
    perMessageDeflate: false,
  });
  const messages: ServerMessage[] = [];
  ws.on("message", (data) => messages.push(JSON.parse(data.toString())));
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  return { ws, messages, send: (type, gameId) => ws.send(JSON.stringify({ type, payload: { gameId } })) };
}

async function waitFor<K extends ServerMessage["type"]>(connection: Connection, type: K): Promise<ServerMessageOf<K>> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const message = connection.messages.find((m): m is ServerMessageOf<K> => m.type === type);
    if (message) return message;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timeout waiting for ${type}`);
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
}

describe("Join and Subscribe Integration Tests", () => {
  const connections: Connection[] = [];

  async function connectUser(token: string): Promise<Connection> {
    const connection = await connect(token);
    connections.push(connection);
    return connection;
  }

  afterEach(async () => {
    connections.forEach(({ ws }) => ws.close());
    connections.length = 0;
    await cleanupTestData();
  });

  afterAll(async () => {
    wss.close();
    server.close();
    await db.destroy();
  });

  test("joining a game does not subscribe the socket to its updates", async () => {
    const [owner, guest] = await Promise.all([helpers.createTestUserWithLogin(), helpers.createTestUserWithLogin()]);
    const gameId = await helpers.createTestGame(owner.token);
    const ownerConnection = await connectUser(owner.token);
    const guestConnection = await connectUser(guest.token);

    ownerConnection.send(WS_MESSAGE_TYPES.JOIN_GAME, gameId);
    ownerConnection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, gameId);
    await waitFor(ownerConnection, WS_MESSAGE_TYPES.GAME_STATE_UPDATE);
    guestConnection.send(WS_MESSAGE_TYPES.JOIN_GAME, gameId);
    await waitFor(guestConnection, WS_MESSAGE_TYPES.GAME_JOINED);

    ownerConnection.send(WS_MESSAGE_TYPES.LEAVE_GAME, gameId);
    await waitFor(ownerConnection, WS_MESSAGE_TYPES.PLAYER_LEFT);
    await settle();

    expect(guestConnection.messages.map((m) => m.type)).toEqual([WS_MESSAGE_TYPES.GAME_JOINED]);
  }, 15000);

  test("a player who is not in the game can subscribe and watch it", async () => {
    const [owner, guest, watcher] = await Promise.all([
      helpers.createTestUserWithLogin(),
      helpers.createTestUserWithLogin(),
      helpers.createTestUserWithLogin(),
    ]);
    const gameId = await helpers.createTestGame(owner.token);
    const watcherConnection = await connectUser(watcher.token);
    const guestConnection = await connectUser(guest.token);

    watcherConnection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, gameId);
    await waitFor(watcherConnection, WS_MESSAGE_TYPES.GAME_STATE_UPDATE);

    guestConnection.send(WS_MESSAGE_TYPES.JOIN_GAME, gameId);
    const joined = await waitFor(watcherConnection, WS_MESSAGE_TYPES.PLAYER_JOINED);

    expect(joined.payload.gameId).toBe(gameId);
  }, 15000);

  test("a socket follows one game at a time", async () => {
    const [firstOwner, secondOwner, watcher] = await Promise.all([
      helpers.createTestUserWithLogin(),
      helpers.createTestUserWithLogin(),
      helpers.createTestUserWithLogin(),
    ]);
    const firstGameId = await helpers.createTestGame(firstOwner.token);
    const secondGameId = await helpers.createTestGame(secondOwner.token);
    const watcherConnection = await connectUser(watcher.token);

    watcherConnection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, firstGameId);
    await waitFor(watcherConnection, WS_MESSAGE_TYPES.GAME_STATE_UPDATE);
    watcherConnection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, secondGameId);
    const error = await waitFor(watcherConnection, WS_MESSAGE_TYPES.ERROR);

    expect(error.payload).toContain("Already subscribed");
  }, 15000);
});
