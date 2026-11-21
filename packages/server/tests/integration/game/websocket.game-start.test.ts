import WebSocket from "ws";

import { config } from "@/configs/config.ts";
import { db } from "@/database.ts";
import { server, wss } from "@/main.ts";
import { UserDTO } from "@/users/userDTO.ts";
import * as helpers from "@tests/integration/helper/helpers.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WsMessage = Record<string, any>;

interface TestPlayer {
  user: UserDTO;
  token: string;
  ws: WebSocket;
}

/**
 * Integration tests for game ready confirmation and auto-start flow.
 *
 * Game Start Flow:
 * 1. Players join a game via WebSocket connection
 * 2. Each player must confirm/accept the game (set_ready) to verify opponents
 * 3. Once ALL players have confirmed ready, the game automatically starts
 */
describe("WebSocket Game Ready and Auto-Start Tests", () => {
  let gameId: number;
  let players: TestPlayer[] = [];
  let creator: { user: UserDTO; token: string };

  beforeEach(async () => {
    creator = await helpers.createTestUserWithLogin();
    gameId = await helpers.createTestGame(creator.token);
    players = [];
  });

  afterEach(async () => {
    players.forEach((player) => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.close();
      }
    });
    await cleanupTestData();
  });

  afterAll(async () => {
    wss.close();
    server.close();
    await db.destroy();
  });

  async function createPlayerConnection(user: UserDTO, token: string): Promise<WebSocket> {
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

  function waitForMessage(ws: WebSocket, messageType: string, timeout = 5000): Promise<WsMessage> {
    return new Promise((resolve, reject) => {
      const receivedMessages: string[] = [];
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${messageType}. Received: ${receivedMessages.join(", ")}`));
      }, timeout);

      function onMessage(data: WebSocket.RawData) {
        try {
          const message = JSON.parse(data.toString());
          receivedMessages.push(message.type);
          if (message.type === messageType) {
            clearTimeout(timeoutId);
            ws.off("message", onMessage);
            resolve(message);
          }
        } catch {
          // Ignore parsing errors
        }
      }
      ws.on("message", onMessage);
    });
  }

  // The next game_state that has this many players
  function waitForPlayerCount(ws: WebSocket, count: number, timeout = 5000): Promise<WsMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error(`Timeout waiting for a game_state with ${count} players`)),
        timeout,
      );

      function onMessage(data: WebSocket.RawData) {
        const message = JSON.parse(data.toString()) as WsMessage;
        if (message.type === "game_state" && message.payload.players.length === count) {
          clearTimeout(timeoutId);
          ws.off("message", onMessage);
          resolve(message);
        }
      }
      ws.on("message", onMessage);
    });
  }

  async function readGameState(ws: WebSocket) {
    const statePromise = waitForMessage(ws, "game_state");
    ws.send(JSON.stringify({ type: "subscribe_game", payload: { gameId } }));
    return (await statePromise).payload;
  }

  async function createAndJoinPlayers(count: number): Promise<TestPlayer[]> {
    const testPlayers: TestPlayer[] = [];

    for (let i = 0; i < count; i++) {
      // First player is the creator (already in game via HTTP), rest are new users
      const isCreator = i === 0;
      const { user, token } = isCreator ? creator : await helpers.createTestUserWithLogin();
      const ws = await createPlayerConnection(user, token);
      testPlayers.push({ user, token, ws });

      // Join game via WebSocket (creator reconnects, others join fresh)
      const joinPromise = waitForMessage(ws, "ok");
      ws.send(
        JSON.stringify({
          type: "join_game",
          payload: { gameId },
        }),
      );
      await joinPromise;
    }

    return testPlayers;
  }

  describe("Ready Confirmation Flow", () => {
    test("should confirm ready and show it in the state", async () => {
      players = await createAndJoinPlayers(2);

      const readyPromise = waitForMessage(players[0].ws, "ok");
      players[0].ws.send(
        JSON.stringify({
          type: "set_ready",
          payload: { gameId, isReady: true },
        }),
      );

      await readyPromise;
      const state = await readGameState(players[0].ws);
      expect(state.players.find((p: { userId: number }) => p.userId === players[0].user.id).isReady).toBe(true);
      expect(state.players.every((p: { isReady: boolean }) => p.isReady)).toBe(false); // Only 1 of 2 ready
      expect(state.status).toBe("waiting");
    });

    test("should auto-start game when all players confirm ready", async () => {
      players = await createAndJoinPlayers(2);

      // Player 1 sets ready
      let readyPromise = waitForMessage(players[0].ws, "ok");
      players[0].ws.send(
        JSON.stringify({
          type: "set_ready",
          payload: { gameId, isReady: true },
        }),
      );
      await readyPromise;

      // Player 2 sets ready - should trigger auto-start
      readyPromise = waitForMessage(players[1].ws, "ok");
      players[1].ws.send(
        JSON.stringify({
          type: "set_ready",
          payload: { gameId, isReady: true },
        }),
      );

      await readyPromise;
      const state = await readGameState(players[0].ws);
      expect(state.players.every((p: { isReady: boolean }) => p.isReady)).toBe(true);
      expect(state.status).toBe("in-progress");
    });

    test("should allow player to unset ready before game starts", async () => {
      players = await createAndJoinPlayers(2);

      // Player 1 sets ready
      let readyPromise = waitForMessage(players[0].ws, "ok");
      players[0].ws.send(
        JSON.stringify({
          type: "set_ready",
          payload: { gameId, isReady: true },
        }),
      );
      await readyPromise;

      // Player 1 unsets ready
      readyPromise = waitForMessage(players[0].ws, "ok");
      players[0].ws.send(
        JSON.stringify({
          type: "set_ready",
          payload: { gameId, isReady: false },
        }),
      );

      await readyPromise;
      const state = await readGameState(players[0].ws);
      expect(state.players.find((p: { userId: number }) => p.userId === players[0].user.id).isReady).toBe(false);
      expect(state.status).toBe("waiting");
    });

    test("should not auto-start when game is not full", async () => {
      // Only 1 player joins (game needs 2)
      players = await createAndJoinPlayers(1);

      // Player sets ready
      const readyPromise = waitForMessage(players[0].ws, "ok");
      players[0].ws.send(
        JSON.stringify({
          type: "set_ready",
          payload: { gameId, isReady: true },
        }),
      );

      await readyPromise;
      const state = await readGameState(players[0].ws);
      expect(state.players.every((p: { isReady: boolean }) => p.isReady)).toBe(true);
      expect(state.status).toBe("waiting"); // one seat is still empty
    });
  });

  describe("Game State After Auto-Start", () => {
    test("should have available moves for current player after game starts", async () => {
      players = await createAndJoinPlayers(2);

      // Both players set ready
      for (const player of players) {
        const readyPromise = waitForMessage(player.ws, "ok");
        player.ws.send(
          JSON.stringify({
            type: "set_ready",
            payload: { gameId, isReady: true },
          }),
        );
        await readyPromise;
      }

      // Request game state for current player
      const statePromise = waitForMessage(players[0].ws, "game_state");
      players[0].ws.send(
        JSON.stringify({
          type: "subscribe_game",
          payload: { gameId },
        }),
      );

      const gameState = await statePromise;
      const state = gameState.payload;
      expect(state.status).toBe("in-progress");
      expect(state.phase).toBe("placing");

      // Current player should have available moves (25 placement positions)
      if (state.viewer.isCurrentPlayer) {
        expect(state.viewer.availableMoves.length).toBe(25);
      }
    });
  });

  describe("Player Join Broadcasts", () => {
    test("should send every subscribed player the new player list when someone joins", async () => {
      // First player (creator) joins via WebSocket and subscribes
      const ws1 = await createPlayerConnection(creator.user, creator.token);
      players.push({ user: creator.user, token: creator.token, ws: ws1 });

      let joinPromise = waitForMessage(ws1, "ok");
      ws1.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
      await joinPromise;

      // Subscribe to get broadcasts
      const subscribePromise = waitForMessage(ws1, "game_state");
      ws1.send(JSON.stringify({ type: "subscribe_game", payload: { gameId } }));
      await subscribePromise;

      // Set up listener for the state with both players
      const stateWithTwoPlayers = waitForPlayerCount(ws1, 2);

      // Second player joins
      const { user: user2, token: token2 } = await helpers.createTestUserWithLogin();
      const ws2 = await createPlayerConnection(user2, token2);
      players.push({ user: user2, token: token2, ws: ws2 });

      joinPromise = waitForMessage(ws2, "ok");
      ws2.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
      await joinPromise;

      // First player should receive the new state
      const broadcast = await stateWithTwoPlayers;
      expect(broadcast.payload.gameId).toBe(gameId);
      expect(broadcast.payload.players.map((p: { userId: number }) => p.userId)).toContain(user2.id);
    });
  });

  describe("Player Disconnect Auto-Remove", () => {
    test("should auto-remove unready player when they disconnect", async () => {
      // First player (creator) joins via WebSocket and subscribes
      const ws1 = await createPlayerConnection(creator.user, creator.token);
      players.push({ user: creator.user, token: creator.token, ws: ws1 });

      let joinPromise = waitForMessage(ws1, "ok");
      ws1.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
      await joinPromise;

      const subscribePromise = waitForMessage(ws1, "game_state");
      ws1.send(JSON.stringify({ type: "subscribe_game", payload: { gameId } }));
      await subscribePromise;

      // Second player joins
      const { user: user2, token: token2 } = await helpers.createTestUserWithLogin();
      const ws2 = await createPlayerConnection(user2, token2);
      players.push({ user: user2, token: token2, ws: ws2 });

      const stateWithTwoPlayers = waitForPlayerCount(ws1, 2);
      joinPromise = waitForMessage(ws2, "ok");
      ws2.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
      await joinPromise;
      await stateWithTwoPlayers;

      const subscribeToGame = waitForMessage(ws2, "game_state");
      ws2.send(JSON.stringify({ type: "subscribe_game", payload: { gameId } }));
      await subscribeToGame;

      // Set up listener for the state without the second player
      const stateWithOnePlayer = waitForPlayerCount(ws1, 1);

      // Second player disconnects (without readying)
      ws2.close();

      // First player should receive the new state
      const broadcast = await stateWithOnePlayer;
      expect(broadcast.payload.gameId).toBe(gameId);
      expect(broadcast.payload.players.map((p: { userId: number }) => p.userId)).not.toContain(user2.id);
    });

    test("should NOT auto-remove ready player when they disconnect", async () => {
      players = await createAndJoinPlayers(2);

      // Player 1 subscribes to get broadcasts
      const subscribePromise = waitForMessage(players[0].ws, "game_state");
      players[0].ws.send(JSON.stringify({ type: "subscribe_game", payload: { gameId } }));
      await subscribePromise;

      // Player 2 sets ready
      const readyPromise = waitForMessage(players[1].ws, "ok");
      players[1].ws.send(
        JSON.stringify({
          type: "set_ready",
          payload: { gameId, isReady: true },
        }),
      );
      await readyPromise;

      // Track if the seat is freed (it shouldn't be)
      let playerLeftReceived = false;
      const playerLeftHandler = (data: WebSocket.RawData) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "game_state" && msg.payload.players.length === 1) {
          playerLeftReceived = true;
        }
      };
      players[0].ws.on("message", playerLeftHandler);

      // Player 2 disconnects (after readying)
      players[1].ws.close();

      // Wait a bit for potential broadcast
      await new Promise((resolve) => setTimeout(resolve, 500));

      players[0].ws.off("message", playerLeftHandler);
      expect(playerLeftReceived).toBe(false);
    });
  });
});
