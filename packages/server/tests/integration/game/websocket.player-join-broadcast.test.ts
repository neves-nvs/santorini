/**
 * Integration test for player join broadcasts
 * Tests the real user flow: Player 1 creates game via HTTP, both players join via WebSocket
 */

import * as helpers from "@tests/integration/helper/helpers.ts";
import { ServerMessageOf, ServerMessageType } from "@santorini/shared";
import { server, wss } from "@/main.ts";
import { UserDTO } from "@/users/userDTO.ts";
import WebSocket from "ws";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";
import { config } from "@/configs/config.ts";
import { db } from "@/database.ts";

interface TestPlayer {
  user: UserDTO;
  token: string;
  ws: WebSocket;
}

async function createPlayerConnection(token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${config.port}`, {
      headers: { Authorization: `Bearer ${token}` },
      perMessageDeflate: false,
    });
    const timeoutId = setTimeout(() => reject(new Error("WebSocket connection timeout")), 5000);
    ws.on("open", () => {
      clearTimeout(timeoutId);
      resolve(ws);
    });
    ws.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

function waitForMessage<K extends ServerMessageType>(
  ws: WebSocket,
  messageType: K,
  timeout = 5000,
): Promise<ServerMessageOf<K>> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for message type: ${messageType}`));
    }, timeout);

    function onMessage(data: WebSocket.RawData) {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === messageType) {
          clearTimeout(timeoutId);
          ws.off("message", onMessage);
          resolve(message);
        }
      } catch {
        // Ignore parse errors
      }
    }

    ws.on("message", onMessage);
  });
}

async function subscribe(ws: WebSocket, gameId: number) {
  const subscribed = waitForMessage(ws, "game_state_update");
  ws.send(JSON.stringify({ type: "subscribe_game", payload: { gameId } }));
  return (await subscribed).payload.state;
}

describe("Player Join Broadcast Integration Test", () => {
  let gameId: number;
  let player1: TestPlayer | null = null;
  let player2: TestPlayer | null = null;

  beforeEach(async () => {
    // Player 1 creates a game via HTTP API (real user flow)
    const { user: user1, token: token1 } = await helpers.createTestUserWithLogin();
    gameId = await helpers.createTestGame(token1);

    // Create WebSocket connection for Player 1
    const ws1 = await createPlayerConnection(token1);
    player1 = { user: user1, token: token1, ws: ws1 };
  });

  afterEach(async () => {
    // Clean up WebSocket connections
    if (player1?.ws?.readyState === WebSocket.OPEN) {
      player1.ws.close();
    }
    if (player2?.ws?.readyState === WebSocket.OPEN) {
      player2.ws.close();
    }

    player1 = null;
    player2 = null;

    await cleanupTestData();
  });

  afterAll(async () => {
    wss.close();
    server.close();
    await db.destroy();
  });

  test("Player 1 should receive player_joined broadcast when Player 2 joins", async () => {
    if (!player1) throw new Error("Player 1 not initialized");

    // Player 1 joins via WebSocket (idempotent - already in game from creation)
    const joinPromise1 = waitForMessage(player1.ws, "ok");
    player1.ws.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
    await joinPromise1;
    await subscribe(player1.ws, gameId);

    // Set up listener for player_joined broadcast BEFORE Player 2 joins
    const playerJoinedPromise = waitForMessage(player1.ws, "player_joined");

    // Player 2 creates connection and joins
    const { user: user2, token: token2 } = await helpers.createTestUserWithLogin();
    const ws2 = await createPlayerConnection(token2);
    player2 = { user: user2, token: token2, ws: ws2 };

    const joinPromise2 = waitForMessage(player2.ws, "ok");
    player2.ws.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
    await joinPromise2;

    // Player 1 should receive player_joined broadcast
    const broadcast = await playerJoinedPromise;
    expect(broadcast.type).toBe("player_joined");
    expect(broadcast.payload.gameId).toBe(gameId);
    expect(broadcast.payload.userId).toBe(user2.id);
    expect(broadcast.payload.playerCount).toBe(2);
  });

  test("Player 1 should receive game_state_update with updated player list when Player 2 joins", async () => {
    if (!player1) throw new Error("Player 1 not initialized");

    // Player 1 joins via WebSocket
    const joinPromise1 = waitForMessage(player1.ws, "ok");
    player1.ws.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
    await joinPromise1;
    const initialState = await subscribe(player1.ws, gameId);

    // Verify Player 1 sees only themselves initially
    expect(initialState.players).toHaveLength(1);
    expect(initialState.players[0].userId).toBe(player1.user.id);

    // Set up listener for game_state_update with 2 players
    const ws1 = player1.ws;
    const stateUpdatePromise = new Promise<ServerMessageOf<"game_state_update">>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timeout waiting for game_state_update with 2 players"));
      }, 5000);

      function onMessage(data: WebSocket.RawData) {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === "game_state_update" && message.payload?.state?.players?.length === 2) {
            clearTimeout(timeoutId);
            ws1.off("message", onMessage);
            resolve(message);
          }
        } catch {
          // Ignore parse errors
        }
      }

      ws1.on("message", onMessage);
    });

    // Player 2 joins
    const { user: user2, token: token2 } = await helpers.createTestUserWithLogin();
    const ws2 = await createPlayerConnection(token2);
    player2 = { user: user2, token: token2, ws: ws2 };

    const joinPromise2 = waitForMessage(player2.ws, "ok");
    player2.ws.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
    await joinPromise2;

    // Player 1 should receive game_state_update with both players
    const stateUpdate = await stateUpdatePromise;
    expect(stateUpdate.type).toBe("game_state_update");
    const { players } = stateUpdate.payload.state;
    expect(players).toHaveLength(2);

    const playerIds = players.map((p) => p.userId);
    expect(playerIds).toContain(player1.user.id);
    expect(playerIds).toContain(user2.id);
  });

  test("Both players should see each other after joining", async () => {
    if (!player1) throw new Error("Player 1 not initialized");

    // Player 1 joins
    const joinPromise1 = waitForMessage(player1.ws, "ok");
    player1.ws.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
    await joinPromise1;

    // Player 2 joins
    const { user: user2, token: token2 } = await helpers.createTestUserWithLogin();
    const ws2 = await createPlayerConnection(token2);
    player2 = { user: user2, token: token2, ws: ws2 };

    const joinPromise2 = waitForMessage(player2.ws, "ok");
    player2.ws.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
    await joinPromise2;
    const state = await subscribe(player2.ws, gameId);

    // Player 2 should see both players once subscribed
    expect(state.players).toHaveLength(2);
    const playerIds = state.players.map((p) => p.userId);
    expect(playerIds).toContain(player1.user.id);
    expect(playerIds).toContain(user2.id);
  });

  test("join_game should be idempotent - Player 1 can rejoin without error", async () => {
    if (!player1) throw new Error("Player 1 not initialized");

    // Player 1 joins first time
    const joinPromise1 = waitForMessage(player1.ws, "ok");
    player1.ws.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
    const response1 = await joinPromise1;
    expect(response1.type).toBe("ok");

    // Player 1 joins again (should not error)
    const joinPromise2 = waitForMessage(player1.ws, "ok");
    player1.ws.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
    const response2 = await joinPromise2;
    expect(response2.type).toBe("ok");

    // Should still see only 1 player
    const state = await subscribe(player1.ws, gameId);
    expect(state.players).toHaveLength(1);
  });
});
