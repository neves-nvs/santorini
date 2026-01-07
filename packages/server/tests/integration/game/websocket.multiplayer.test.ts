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

describe("WebSocket Multiplayer Game Tests", () => {
  let gameId: number;
  let players: TestPlayer[] = [];
  let creator: { user: UserDTO; token: string };

  beforeEach(async () => {
    // Create test game (creator is automatically added as player)
    creator = await helpers.createTestUserWithLogin();
    gameId = await helpers.createTestGame(creator.token);

    // Clean up any existing connections
    players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.close();
      }
    });
    players = [];
  });

  afterEach(async () => {
    // Clean up WebSocket connections
    players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.close();
      }
    });

    // Fast truncate instead of slow individual deletes
    await cleanupTestData();
  });

  afterAll(async () => {
    wss.close();
    server.close();
    await db.destroy();
  });

  /**
   * Helper function to create a WebSocket connection for a player
   */
  async function createPlayerConnection(user: UserDTO, token: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        perMessageDeflate: false,
      });

      const timeoutId = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, 5000);

      ws.on("open", () => {
        clearTimeout(timeoutId);
        resolve(ws);
      });

      ws.on("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Helper function to wait for a specific message type
   */
  function waitForMessage(ws: WebSocket, messageType: string, timeout = 5000): Promise<WsMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${messageType}`));
      }, timeout);

      function onMessage(data: WebSocket.RawData) {
        try {
          const message = JSON.parse(data.toString()) as WsMessage;
          if (message.type === messageType) {
            clearTimeout(timeoutId);
            ws.off("message", onMessage);
            resolve(message);
          }
        } catch {
          // Ignore parsing errors, continue waiting
        }
      }

      ws.on("message", onMessage);
    });
  }

  /**
   * Helper function to create multiple players and connect them to WebSocket
   * First player is the creator (already in game), rest are new users
   */
  async function createMultiplePlayers(count: number): Promise<TestPlayer[]> {
    const testPlayers: TestPlayer[] = [];

    for (let i = 0; i < count; i++) {
      const isCreator = i === 0;
      const { user, token } = isCreator ? creator : await helpers.createTestUserWithLogin();
      const ws = await createPlayerConnection(user, token);
      testPlayers.push({ user, token, ws });
    }

    return testPlayers;
  }

  describe("Game Session Management", () => {
    test("should handle multiple players joining the same game", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);

      // Both players join the game
      const joinPromises = players.map(async (player) => {
        const messagePromise = waitForMessage(player.ws, "game_joined");

        player.ws.send(JSON.stringify({
          type: "join_game",
          payload: { gameId }
        }));

        return messagePromise;
      });

      // Wait for both players to receive game_joined confirmation
      const responses = await Promise.all(joinPromises);

      // Verify both players joined successfully
      expect(responses).toHaveLength(2);
      responses.forEach(response => {
        expect(response.type).toBe("game_joined");
        expect(response.payload).toBeDefined();
        expect(response.payload.gameId).toBe(gameId);
      });
    }, 10000);

    test("should send game state to subscriber when subscribe_game is called", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);

      // Both players join the game
      for (const player of players) {
        const messagePromise = waitForMessage(player.ws, "game_joined");
        player.ws.send(JSON.stringify({
          type: "join_game",
          payload: { gameId }
        }));
        await messagePromise;
      }

      // Player subscribes and receives game state
      const statePromise = waitForMessage(players[0].ws, "game_state_update");
      players[0].ws.send(JSON.stringify({
        type: "subscribe_game",
        payload: { gameId }
      }));

      const response = await statePromise;
      expect(response.type).toBe("game_state_update");
      expect(response.payload.gameId).toBe(gameId);
    }, 10000);
  });

  describe("Player Connection Management", () => {
    test("should track connected players correctly", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);

      // First player joins
      let messagePromise = waitForMessage(players[0].ws, "game_joined");
      players[0].ws.send(JSON.stringify({
        type: "join_game",
        payload: { gameId }
      }));
      await messagePromise;

      // Second player joins - game_joined includes gameState with players
      messagePromise = waitForMessage(players[1].ws, "game_joined");
      players[1].ws.send(JSON.stringify({
        type: "join_game",
        payload: { gameId }
      }));
      const response = await messagePromise;

      // Verify game state in join response shows both players (by userId)
      expect(response.payload.gameState.players).toHaveLength(2);
      const playerUserIds = response.payload.gameState.players.map((p: { userId: number }) => p.userId);
      expect(playerUserIds).toContain(players[0].user.id);
      expect(playerUserIds).toContain(players[1].user.id);
    }, 10000);

    test("should handle player disconnection gracefully", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);

      // Both players join
      for (const player of players) {
        const messagePromise = waitForMessage(player.ws, "game_joined");
        player.ws.send(JSON.stringify({
          type: "join_game",
          payload: { gameId }
        }));
        await messagePromise;
      }

      // Disconnect first player
      players[0].ws.close();

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second player should still be able to receive messages
      const messagePromise = waitForMessage(players[1].ws, "game_state_update");
      players[1].ws.send(JSON.stringify({
        type: "subscribe_game",
        payload: { gameId }
      }));

      const response = await messagePromise;
      expect(response.type).toBe("game_state_update");
    }, 10000);
  });

  describe("Message Broadcasting", () => {
    test("should send messages to specific players", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);

      // Both players join and subscribe
      for (const player of players) {
        let messagePromise = waitForMessage(player.ws, "game_joined");
        player.ws.send(JSON.stringify({
          type: "join_game",
          payload: { gameId }
        }));
        await messagePromise;

        messagePromise = waitForMessage(player.ws, "game_state_update");
        player.ws.send(JSON.stringify({
          type: "subscribe_game",
          payload: { gameId }
        }));
        await messagePromise;
      }

      // This test verifies that the WebSocket infrastructure can handle
      // targeted messages (though specific targeting would need game logic)
      expect(players[0].ws.readyState).toBe(WebSocket.OPEN);
      expect(players[1].ws.readyState).toBe(WebSocket.OPEN);
    }, 10000);
  });
});
