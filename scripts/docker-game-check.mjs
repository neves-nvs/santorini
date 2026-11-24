import assert from "node:assert/strict";
import { once } from "node:events";

const origin = process.argv[2];
const signal = AbortSignal.timeout(15_000);
const clients = [];

async function post(path, body, cookie, status = 200) {
  const response = await fetch(`${origin}/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  assert.equal(response.status, status, `POST ${path}: ${await response.clone().text()}`);
  return response;
}

async function connect(username) {
  const credentials = { username, password: "docker-game-password" };
  await post("/users", credentials, undefined, 201);
  const session = await post("/session", credentials);
  const cookie = session.headers.getSetCookie()[0].split(";")[0];
  const { ticket } = await (await post("/ws-ticket", undefined, cookie)).json();
  const url = new URL("/ws", origin);
  url.protocol = "ws:";
  url.searchParams.set("ticket", ticket);
  const socket = new WebSocket(url);
  const client = { socket, cookie, messages: [], nextId: 0 };
  clients.push(client);
  socket.addEventListener("message", (event) => client.messages.push(JSON.parse(event.data)));
  await once(socket, "open", { signal });
  return client;
}

async function waitFor(client, predicate) {
  for (;;) {
    const message = client.messages.find(predicate);
    if (message) return message;
    await once(client.socket, "message", { signal });
  }
}

async function command(client, type, payload) {
  const id = String(++client.nextId);
  client.socket.send(JSON.stringify({ type, id, payload }));
  const reply = await waitFor(client, (message) => message.id === id);
  assert.equal(reply.type, "ok", JSON.stringify(reply));
}

function gameState(client, predicate) {
  return waitFor(client, (message) => message.type === "game_state" && predicate(message.payload));
}

try {
  const first = await connect("docker-game-one");
  await connect("docker-game-two");
  const { gameId } = await (await post("/games", { maxPlayers: 2 }, first.cookie)).json();
  for (const client of clients) {
    await command(client, "join_game", { gameId });
    await command(client, "subscribe_game", { gameId });
    await command(client, "ping", {});
  }
  await gameState(first, (state) => state.players.length === 2);
  console.log("ok   packaged server broadcasts player joins and answers heartbeats");

  for (const client of clients) await command(client, "set_ready", { gameId, isReady: true });
  const started = await Promise.all(
    clients.map((client) => gameState(client, (state) => state.status === "in-progress")),
  );
  assert.equal(started[0].payload.phase, "placing");
  assert.ok(started[0].payload.players.every((player) => player.isReady));
  console.log("ok   readiness starts the game for both packaged clients");

  const activeIndex = started.findIndex(({ payload }) => payload.viewer.isCurrentPlayer);
  assert.notEqual(activeIndex, -1);
  const active = clients[activeIndex];
  const move = started[activeIndex].payload.viewer.availableMoves[0];
  assert.equal(move.type, "place_worker");
  const version = started[activeIndex].payload.version;
  await command(active, "make_move", { gameId, move });
  const updated = await Promise.all(clients.map((client) => gameState(client, (state) => state.version > version)));
  for (const { payload } of updated) {
    const cells = payload.board.cells.flat();
    assert.equal(cells.filter((cell) => cell.worker !== null).length, 1);
  }
  assert.deepEqual(updated[0].payload.board, updated[1].payload.board);
  console.log("ok   a move updates both players through the packaged engine and WebSocket server");
} finally {
  await Promise.all(
    clients.map(async ({ socket }) => {
      if (socket.readyState === WebSocket.CLOSED) return;
      const closed = once(socket, "close", { signal });
      socket.close();
      await closed;
    }),
  );
}
