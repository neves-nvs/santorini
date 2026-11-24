import { ServerMessage, ServerMessageOf, ServerMessageType, WS_MESSAGE_TYPES } from "@santorini/shared";
import WebSocket from "ws";

import { config } from "@/configs/config.ts";
import { db } from "@/database.ts";
import { server, wss } from "@/main.ts";
import * as helpers from "@tests/integration/helper/helpers.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";

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

async function waitFor<K extends ServerMessageType>(
  connection: Connection,
  type: K,
  matches: (message: ServerMessageOf<K>) => boolean = () => true,
): Promise<ServerMessageOf<K>> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const message = connection.messages.find(
      (m): m is ServerMessageOf<K> => m.type === type && matches(m as ServerMessageOf<K>),
    );
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

  test("a heartbeat is answered before joining a game", async () => {
    const owner = await helpers.createTestUserWithLogin();
    const connection = await connectUser(owner.token);
    connection.ws.send(JSON.stringify({ type: "ping", id: "heartbeat", payload: {} }));
    expect(await waitFor(connection, WS_MESSAGE_TYPES.OK, (m) => m.id === "heartbeat")).toEqual({
      type: "ok",
      id: "heartbeat",
      payload: {},
    });
  });

  test("a subscription to an unknown game can be retried on the same socket", async () => {
    const owner = await helpers.createTestUserWithLogin();
    const gameId = await helpers.createTestGame(owner.token);
    const connection = await connectUser(owner.token);
    connection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, gameId + 10000);
    await waitFor(connection, WS_MESSAGE_TYPES.ERROR);
    connection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, gameId);
    const state = await waitFor(connection, WS_MESSAGE_TYPES.GAME_STATE);
    expect(state.payload.gameId).toBe(gameId);
    await waitFor(connection, WS_MESSAGE_TYPES.OK);
  });

  test("joining a game does not subscribe the socket to its updates", async () => {
    const [owner, guest] = await Promise.all([helpers.createTestUserWithLogin(), helpers.createTestUserWithLogin()]);
    const gameId = await helpers.createTestGame(owner.token);
    const ownerConnection = await connectUser(owner.token);
    const guestConnection = await connectUser(guest.token);

    ownerConnection.send(WS_MESSAGE_TYPES.JOIN_GAME, gameId);
    ownerConnection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, gameId);
    await waitFor(ownerConnection, WS_MESSAGE_TYPES.GAME_STATE);
    guestConnection.send(WS_MESSAGE_TYPES.JOIN_GAME, gameId);
    await waitFor(guestConnection, WS_MESSAGE_TYPES.OK);

    ownerConnection.ws.send(JSON.stringify({ type: WS_MESSAGE_TYPES.LEAVE_GAME, id: "left", payload: { gameId } }));
    await waitFor(ownerConnection, WS_MESSAGE_TYPES.OK, (m) => m.id === "left");
    await settle();

    expect(guestConnection.messages.map((m) => m.type)).toEqual([WS_MESSAGE_TYPES.OK]);
  });

  test("everyone subscribed sees the new player list when someone leaves, and the one who left stops following", async () => {
    const [owner, guest] = await Promise.all([helpers.createTestUserWithLogin(), helpers.createTestUserWithLogin()]);
    const gameId = await helpers.createTestGame(owner.token);
    const ownerConnection = await connectUser(owner.token);
    const guestConnection = await connectUser(guest.token);
    guestConnection.send(WS_MESSAGE_TYPES.JOIN_GAME, gameId);
    guestConnection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, gameId);
    await waitFor(guestConnection, WS_MESSAGE_TYPES.GAME_STATE, (m) => m.payload.players.length === 2);
    ownerConnection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, gameId);
    await waitFor(ownerConnection, WS_MESSAGE_TYPES.GAME_STATE);
    const seenByOwner = ownerConnection.messages.length;

    guestConnection.ws.send(JSON.stringify({ type: WS_MESSAGE_TYPES.LEAVE_GAME, id: "left", payload: { gameId } }));
    await waitFor(guestConnection, WS_MESSAGE_TYPES.OK, (m) => m.id === "left");
    const update = await waitFor(ownerConnection, WS_MESSAGE_TYPES.GAME_STATE, (m) => m.payload.players.length === 1);
    await settle();

    expect(update.payload.players.map((p) => p.userId)).not.toContain(guest.user.id);
    expect(ownerConnection.messages.length).toBeGreaterThan(seenByOwner);
  });

  test("a socket that left a game gets nothing more about it", async () => {
    const [owner, guest] = await Promise.all([helpers.createTestUserWithLogin(), helpers.createTestUserWithLogin()]);
    const gameId = await helpers.createTestGame(owner.token);
    const guestConnection = await connectUser(guest.token);
    guestConnection.send(WS_MESSAGE_TYPES.JOIN_GAME, gameId);
    guestConnection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, gameId);
    await waitFor(guestConnection, WS_MESSAGE_TYPES.GAME_STATE, (m) => m.payload.players.length === 2);
    guestConnection.ws.send(JSON.stringify({ type: WS_MESSAGE_TYPES.LEAVE_GAME, id: "left", payload: { gameId } }));
    await waitFor(guestConnection, WS_MESSAGE_TYPES.OK, (m) => m.id === "left");
    const received = guestConnection.messages.length;

    const other = await helpers.createTestUserWithLogin();
    const otherConnection = await connectUser(other.token);
    otherConnection.send(WS_MESSAGE_TYPES.JOIN_GAME, gameId);
    await waitFor(otherConnection, WS_MESSAGE_TYPES.OK);
    await settle();

    expect(guestConnection.messages).toHaveLength(received);
  });

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
    await waitFor(watcherConnection, WS_MESSAGE_TYPES.GAME_STATE);

    guestConnection.send(WS_MESSAGE_TYPES.JOIN_GAME, gameId);
    const update = await waitFor(watcherConnection, WS_MESSAGE_TYPES.GAME_STATE, (m) => m.payload.players.length === 2);

    expect(update.payload.gameId).toBe(gameId);
    expect(update.payload.viewer).toEqual({ role: "spectator" });
  });

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
    await waitFor(watcherConnection, WS_MESSAGE_TYPES.GAME_STATE);
    watcherConnection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, secondGameId);
    const error = await waitFor(watcherConnection, WS_MESSAGE_TYPES.ERROR);

    expect(error.payload.code).toBe("invalid_game_state");
    expect(error.payload.message).toContain("Already subscribed");
  });

  test("rejects a game id that is not a number", async () => {
    const owner = await helpers.createTestUserWithLogin();
    const gameId = await helpers.createTestGame(owner.token);
    const connection = await connectUser(owner.token);

    connection.ws.send(JSON.stringify({ type: WS_MESSAGE_TYPES.SUBSCRIBE_GAME, payload: { gameId: String(gameId) } }));
    const error = await waitFor(connection, WS_MESSAGE_TYPES.ERROR);

    expect(error.payload.code).toBe("invalid_payload");
    expect(error.payload.message).toContain("Invalid subscribe_game payload: gameId");
  });

  test("answers each command with an ok or an error that carries its id", async () => {
    const owner = await helpers.createTestUserWithLogin();
    const gameId = await helpers.createTestGame(owner.token);
    const connection = await connectUser(owner.token);

    connection.ws.send(JSON.stringify({ type: WS_MESSAGE_TYPES.JOIN_GAME, id: "a1", payload: { gameId } }));
    await waitFor(connection, WS_MESSAGE_TYPES.OK);
    connection.ws.send(
      JSON.stringify({ type: WS_MESSAGE_TYPES.JOIN_GAME, id: "a2", payload: { gameId: gameId + 1000 } }),
    );
    await waitFor(connection, WS_MESSAGE_TYPES.ERROR);

    expect(connection.messages).toEqual([
      { type: WS_MESSAGE_TYPES.OK, id: "a1", payload: { gameId } },
      { type: WS_MESSAGE_TYPES.ERROR, id: "a2", payload: { code: "game_not_found", message: "Game not found" } },
    ]);
  });

  test("the version of a game grows with every change, across requests", async () => {
    const [owner, guest] = await Promise.all([helpers.createTestUserWithLogin(), helpers.createTestUserWithLogin()]);
    const gameId = await helpers.createTestGame(owner.token);
    const ownerConnection = await connectUser(owner.token);
    const guestConnection = await connectUser(guest.token);
    ownerConnection.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, gameId);
    await waitFor(ownerConnection, WS_MESSAGE_TYPES.GAME_STATE);

    guestConnection.send(WS_MESSAGE_TYPES.JOIN_GAME, gameId);
    await waitFor(ownerConnection, WS_MESSAGE_TYPES.GAME_STATE, (m) => m.payload.players.length === 2);
    for (const connection of [ownerConnection, guestConnection]) {
      connection.ws.send(
        JSON.stringify({ type: WS_MESSAGE_TYPES.SET_READY, id: "ready", payload: { gameId, isReady: true } }),
      );
      await waitFor(connection, WS_MESSAGE_TYPES.OK, (m) => m.id === "ready");
    }
    await waitFor(ownerConnection, WS_MESSAGE_TYPES.GAME_STATE, (m) => m.payload.status === "in-progress");

    const versions = ownerConnection.messages.flatMap((m) =>
      m.type === WS_MESSAGE_TYPES.GAME_STATE ? [m.payload.version] : [],
    );
    expect(versions.length).toBeGreaterThanOrEqual(4);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
  });
});
