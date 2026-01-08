import * as helpers from "../helper/helpers";

import { server, wss } from "../../../src/main";
import { PORT } from "../../../src/configs/config";
import { UserDTO } from "../../../src/users/userDTO";
import WebSocket from "ws";
import { cleanupTestData } from "../helper/testDb";
import { db } from "../../../src/database";

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
    players.forEach(player => {
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
      const ws = new WebSocket(`ws://localhost:${PORT}`, {
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
        reject(new Error(`Timeout waiting for message type: ${messageType}. Received: ${receivedMessages.join(', ')}`));
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

  async function createAndJoinPlayers(count: number): Promise<TestPlayer[]> {
    const testPlayers: TestPlayer[] = [];

    for (let i = 0; i < count; i++) {
      // First player is the creator (already in game via HTTP), rest are new users
      const isCreator = i === 0;
      const { user, token } = isCreator ? creator : await helpers.createTestUserWithLogin();
      const ws = await createPlayerConnection(user, token);
      testPlayers.push({ user, token, ws });

      // Join game via WebSocket (creator reconnects, others join fresh)
      const joinPromise = waitForMessage(ws, "game_joined");
      ws.send(JSON.stringify({
        type: "join_game",
        payload: { gameId }
      }));
      await joinPromise;
    }

    return testPlayers;
  }

  describe("Ready Confirmation Flow", () => {
    test("should receive ready_status_update when setting ready", async () => {
      players = await createAndJoinPlayers(2);
      
      const readyPromise = waitForMessage(players[0].ws, "ready_status_update");
      players[0].ws.send(JSON.stringify({
        type: "set_ready",
        payload: { gameId, isReady: true }
      }));
      
      const response = await readyPromise;
      expect(response.type).toBe("ready_status_update");
      expect(response.payload.ready).toBe(true);
      expect(response.payload.allReady).toBe(false); // Only 1 of 2 ready
      expect(response.payload.gameStarted).toBe(false);
    }, 10000);

    test("should auto-start game when all players confirm ready", async () => {
      players = await createAndJoinPlayers(2);

      // Player 1 sets ready
      let readyPromise = waitForMessage(players[0].ws, "ready_status_update");
      players[0].ws.send(JSON.stringify({
        type: "set_ready",
        payload: { gameId, isReady: true }
      }));
      await readyPromise;

      // Player 2 sets ready - should trigger auto-start
      readyPromise = waitForMessage(players[1].ws, "ready_status_update");
      players[1].ws.send(JSON.stringify({
        type: "set_ready",
        payload: { gameId, isReady: true }
      }));

      const response = await readyPromise;
      expect(response.payload.ready).toBe(true);
      expect(response.payload.allReady).toBe(true);
      expect(response.payload.gameStarted).toBe(true);
    }, 10000);

    test("should allow player to unset ready before game starts", async () => {
      players = await createAndJoinPlayers(2);

      // Player 1 sets ready
      let readyPromise = waitForMessage(players[0].ws, "ready_status_update");
      players[0].ws.send(JSON.stringify({
        type: "set_ready",
        payload: { gameId, isReady: true }
      }));
      await readyPromise;

      // Player 1 unsets ready
      readyPromise = waitForMessage(players[0].ws, "ready_status_update");
      players[0].ws.send(JSON.stringify({
        type: "set_ready",
        payload: { gameId, isReady: false }
      }));

      const response = await readyPromise;
      expect(response.payload.ready).toBe(false);
      expect(response.payload.gameStarted).toBe(false);
    }, 10000);

    test("should not auto-start when game is not full", async () => {
      // Only 1 player joins (game needs 2)
      players = await createAndJoinPlayers(1);

      // Player sets ready
      const readyPromise = waitForMessage(players[0].ws, "ready_status_update");
      players[0].ws.send(JSON.stringify({
        type: "set_ready",
        payload: { gameId, isReady: true }
      }));

      const response = await readyPromise;
      expect(response.payload.ready).toBe(true);
      expect(response.payload.allReady).toBe(false);
      expect(response.payload.gameStarted).toBe(false);
    }, 10000);
  });

  describe("Game State After Auto-Start", () => {
    test("should have available moves for current player after game starts", async () => {
      players = await createAndJoinPlayers(2);

      // Both players set ready
      for (const player of players) {
        const readyPromise = waitForMessage(player.ws, "ready_status_update");
        player.ws.send(JSON.stringify({
          type: "set_ready",
          payload: { gameId, isReady: true }
        }));
        await readyPromise;
      }

      // Request game state for current player
      const statePromise = waitForMessage(players[0].ws, "game_state_update");
      players[0].ws.send(JSON.stringify({
        type: "subscribe_game",
        payload: { gameId }
      }));

      const gameState = await statePromise;
      // State is nested under payload.state
      const state = gameState.payload.state;
      expect(state.status).toBe("in-progress");
      expect(state.phase).toBe("placing");

      // Current player should have available moves (25 placement positions)
      if (state.isCurrentPlayer) {
        expect(state.availableMoves).toBeDefined();
        expect(state.availableMoves.length).toBe(25);
      }
    }, 15000);
  });

  describe("Player Join Broadcasts", () => {
    test("should broadcast player_joined to subscribed players when someone joins", async () => {
      // First player (creator) joins via WebSocket and subscribes
      const ws1 = await createPlayerConnection(creator.user, creator.token);
      players.push({ user: creator.user, token: creator.token, ws: ws1 });

      let joinPromise = waitForMessage(ws1, "game_joined");
      ws1.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
      await joinPromise;

      // Subscribe to get broadcasts
      const subscribePromise = waitForMessage(ws1, "game_state_update");
      ws1.send(JSON.stringify({ type: "subscribe_game", payload: { gameId } }));
      await subscribePromise;

      // Set up listener for player_joined
      const playerJoinedPromise = waitForMessage(ws1, "player_joined");

      // Second player joins
      const { user: user2, token: token2 } = await helpers.createTestUserWithLogin();
      const ws2 = await createPlayerConnection(user2, token2);
      players.push({ user: user2, token: token2, ws: ws2 });

      joinPromise = waitForMessage(ws2, "game_joined");
      ws2.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
      await joinPromise;

      // First player should receive player_joined broadcast
      const broadcast = await playerJoinedPromise;
      expect(broadcast.type).toBe("player_joined");
      expect(broadcast.payload.gameId).toBe(gameId);
      expect(broadcast.payload.playerCount).toBe(2);
    }, 15000);
  });

  describe("Player Disconnect Auto-Remove", () => {
    test("should auto-remove unready player when they disconnect", async () => {
      // First player (creator) joins via WebSocket and subscribes
      const ws1 = await createPlayerConnection(creator.user, creator.token);
      players.push({ user: creator.user, token: creator.token, ws: ws1 });

      let joinPromise = waitForMessage(ws1, "game_joined");
      ws1.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
      await joinPromise;

      const subscribePromise = waitForMessage(ws1, "game_state_update");
      ws1.send(JSON.stringify({ type: "subscribe_game", payload: { gameId } }));
      await subscribePromise;

      // Second player joins
      const { user: user2, token: token2 } = await helpers.createTestUserWithLogin();
      const ws2 = await createPlayerConnection(user2, token2);
      players.push({ user: user2, token: token2, ws: ws2 });

      const playerJoinedPromise = waitForMessage(ws1, "player_joined");
      joinPromise = waitForMessage(ws2, "game_joined");
      ws2.send(JSON.stringify({ type: "join_game", payload: { gameId } }));
      await joinPromise;
      await playerJoinedPromise;

      // Set up listener for player_left broadcast
      const playerLeftPromise = waitForMessage(ws1, "player_left");

      // Second player disconnects (without readying)
      ws2.close();

      // First player should receive player_left broadcast
      const broadcast = await playerLeftPromise;
      expect(broadcast.type).toBe("player_left");
      expect(broadcast.payload.gameId).toBe(gameId);
      expect(broadcast.payload.userId).toBe(user2.id);
      expect(broadcast.payload.playerCount).toBe(1);
    }, 15000);

    test("should NOT auto-remove ready player when they disconnect", async () => {
      players = await createAndJoinPlayers(2);

      // Player 1 subscribes to get broadcasts
      const subscribePromise = waitForMessage(players[0].ws, "game_state_update");
      players[0].ws.send(JSON.stringify({ type: "subscribe_game", payload: { gameId } }));
      await subscribePromise;

      // Player 2 sets ready
      const readyPromise = waitForMessage(players[1].ws, "ready_status_update");
      players[1].ws.send(JSON.stringify({
        type: "set_ready",
        payload: { gameId, isReady: true }
      }));
      await readyPromise;

      // Track if we receive player_left (we shouldn't)
      let playerLeftReceived = false;
      const playerLeftHandler = (data: WebSocket.RawData) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "player_left") {
          playerLeftReceived = true;
        }
      };
      players[0].ws.on("message", playerLeftHandler);

      // Player 2 disconnects (after readying)
      players[1].ws.close();

      // Wait a bit for potential broadcast
      await new Promise(resolve => setTimeout(resolve, 500));

      players[0].ws.off("message", playerLeftHandler);
      expect(playerLeftReceived).toBe(false);
    }, 15000);
  });
});

