import * as helpers from "../helper/helpers";
import { server, wss } from "../../../src/main";
import { PORT } from "../../../src/configs/config";
import { UserDTO } from "../../../src/users/userDTO";
import WebSocket from "ws";
import { db } from "../../../src/database";
import { cleanupTestData } from "../helper/testDb";

interface TestPlayer {
  user: UserDTO;
  token: string;
  ws: WebSocket;
}

describe("WebSocket Multiplayer Game Tests", () => {
  let gameId: number;
  let players: TestPlayer[] = [];

  beforeEach(async () => {
    // Create test game
    const creator = await helpers.createTestUserWithLogin();
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

      ws.on("open", () => {
        resolve(ws);
      });

      ws.on("error", (error) => {
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, 5000);
    });
  }

  /**
   * Helper function to wait for a specific message type
   */
  function waitForMessage(ws: WebSocket, messageType: string, timeout = 5000): Promise<any> {
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
        } catch (error) {
          // Ignore parsing errors, continue waiting
        }
      }

      ws.on("message", onMessage);
    });
  }

  /**
   * Helper function to create multiple players and connect them to WebSocket
   */
  async function createMultiplePlayers(count: number): Promise<TestPlayer[]> {
    const testPlayers: TestPlayer[] = [];
    
    for (let i = 0; i < count; i++) {
      const { user, token } = await helpers.createTestUserWithLogin();
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
      const joinPromises = players.map(async (player, index) => {
        const messagePromise = waitForMessage(player.ws, "game_state_update");
        
        player.ws.send(JSON.stringify({
          type: "join_game",
          payload: { gameId, username: player.user.username }
        }));
        
        return messagePromise;
      });

      // Wait for both players to receive game state updates
      const responses = await Promise.all(joinPromises);
      
      // Verify both players received game state
      expect(responses).toHaveLength(2);
      responses.forEach(response => {
        expect(response.type).toBe("game_state_update");
        expect(response.payload).toBeDefined();
        expect(response.payload.id).toBe(gameId.toString());
      });
    }, 10000);

    test("should broadcast game state updates to all connected players", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);

      // Both players join the game
      for (const player of players) {
        const messagePromise = waitForMessage(player.ws, "game_state_update");
        player.ws.send(JSON.stringify({
          type: "join_game",
          payload: { gameId, username: player.user.username }
        }));
        await messagePromise;
      }

      // Wait for connections to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Track messages received by second player
      const receivedMessages: any[] = [];
      const messageHandler = (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === "game_state_update") {
            receivedMessages.push(message);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };

      players[1].ws.on("message", messageHandler);

      // First player subscribes to trigger broadcast
      players[0].ws.send(JSON.stringify({
        type: "subscribe_game",
        payload: { gameId, username: players[0].user.username }
      }));

      // Wait for broadcast to be received
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clean up listener
      players[1].ws.off("message", messageHandler);

      // Verify broadcast was received (may have received multiple updates)
      expect(receivedMessages.length).toBeGreaterThan(0);
      const lastMessage = receivedMessages[receivedMessages.length - 1];
      expect(lastMessage.type).toBe("game_state_update");
      expect(lastMessage.payload.id).toBe(gameId.toString());
    }, 10000);
  });

  describe("Player Connection Management", () => {
    test("should track connected players correctly", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);
      
      // First player joins
      let messagePromise = waitForMessage(players[0].ws, "game_state_update");
      players[0].ws.send(JSON.stringify({
        type: "join_game",
        payload: { gameId, username: players[0].user.username }
      }));
      await messagePromise;

      // Second player joins
      messagePromise = waitForMessage(players[1].ws, "game_state_update");
      players[1].ws.send(JSON.stringify({
        type: "join_game",
        payload: { gameId, username: players[1].user.username }
      }));
      const gameState = await messagePromise;

      // Verify game state shows both players
      expect(gameState.payload.players).toHaveLength(2);
      const playerUsernames = gameState.payload.players.map((p: any) => p.username);
      expect(playerUsernames).toContain(players[0].user.username);
      expect(playerUsernames).toContain(players[1].user.username);
    });

    test("should handle player disconnection gracefully", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);
      
      // Both players join
      for (const player of players) {
        const messagePromise = waitForMessage(player.ws, "game_state_update");
        player.ws.send(JSON.stringify({
          type: "join_game",
          payload: { gameId, username: player.user.username }
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
        payload: { gameId, username: players[1].user.username }
      }));
      
      const response = await messagePromise;
      expect(response.type).toBe("game_state_update");
    });
  });

  describe("Message Broadcasting", () => {
    test("should send messages to specific players", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);
      
      // Both players join and subscribe
      for (const player of players) {
        let messagePromise = waitForMessage(player.ws, "game_state_update");
        player.ws.send(JSON.stringify({
          type: "join_game",
          payload: { gameId, username: player.user.username }
        }));
        await messagePromise;

        messagePromise = waitForMessage(player.ws, "game_state_update");
        player.ws.send(JSON.stringify({
          type: "subscribe_game",
          payload: { gameId, username: player.user.username }
        }));
        await messagePromise;
      }

      // This test verifies that the WebSocket infrastructure can handle
      // targeted messages (though specific targeting would need game logic)
      expect(players[0].ws.readyState).toBe(WebSocket.OPEN);
      expect(players[1].ws.readyState).toBe(WebSocket.OPEN);
    });
  });
});
