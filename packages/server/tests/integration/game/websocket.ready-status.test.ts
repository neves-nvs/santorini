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

describe("WebSocket Player Ready Status Tests", () => {
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

  /**
   * Helper function to join players to the game
   */
  async function joinPlayersToGame(players: TestPlayer[]): Promise<void> {
    for (const player of players) {
      const messagePromise = waitForMessage(player.ws, "game_state_update");
      player.ws.send(JSON.stringify({
        type: "join_game",
        payload: { gameId, username: player.user.username }
      }));
      await messagePromise;
    }
  }

  describe("Player Ready Status Management", () => {
    test("should track player ready status correctly", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);
      
      // Both players join the game
      await joinPlayersToGame(players);

      // Subscribe both players to get ready status updates
      for (const player of players) {
        const messagePromise = waitForMessage(player.ws, "game_state_update");
        player.ws.send(JSON.stringify({
          type: "subscribe_game",
          payload: { gameId, username: player.user.username }
        }));
        const gameState = await messagePromise;
        
        // Verify initial ready status is false
        expect(gameState.payload.playersReadyStatus).toBeDefined();
        expect(gameState.payload.playersReadyStatus).toHaveLength(2);
        
        // All players should initially be not ready
        gameState.payload.playersReadyStatus.forEach((status: any) => {
          expect(status.isReady).toBe(false);
        });
      }
    }, 10000);

    test("should handle player setting ready status", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);
      
      // Both players join and subscribe
      await joinPlayersToGame(players);
      
      for (const player of players) {
        const messagePromise = waitForMessage(player.ws, "game_state_update");
        player.ws.send(JSON.stringify({
          type: "subscribe_game",
          payload: { gameId, username: player.user.username }
        }));
        await messagePromise;
      }

      // Wait for connections to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Set up message listener for second player to catch ready status updates
      const readyStatusMessages: any[] = [];
      const messageHandler = (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === "game_state_update" && message.payload.playersReadyStatus) {
            readyStatusMessages.push(message);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };

      players[1].ws.on("message", messageHandler);

      // First player sets ready status
      players[0].ws.send(JSON.stringify({
        type: "set_ready",
        payload: { gameId, isReady: true }
      }));

      // Wait for ready status update to be broadcast
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clean up listener
      players[1].ws.off("message", messageHandler);

      // Verify ready status was broadcast (should have received at least one update)
      expect(readyStatusMessages.length).toBeGreaterThan(0);
      
      const lastUpdate = readyStatusMessages[readyStatusMessages.length - 1];
      expect(lastUpdate.payload.playersReadyStatus).toBeDefined();
      expect(lastUpdate.payload.playersReadyStatus).toHaveLength(2);
      
      // Find the first player's ready status
      const player1Status = lastUpdate.payload.playersReadyStatus.find(
        (status: any) => status.userId === players[0].user.id
      );
      expect(player1Status).toBeDefined();
      expect(player1Status.isReady).toBe(true);
    }, 15000);

    test("should handle multiple players ready status changes", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);
      
      // Both players join and subscribe
      await joinPlayersToGame(players);
      
      for (const player of players) {
        const messagePromise = waitForMessage(player.ws, "game_state_update");
        player.ws.send(JSON.stringify({
          type: "subscribe_game",
          payload: { gameId, username: player.user.username }
        }));
        await messagePromise;
      }

      // Both players set ready status
      for (const player of players) {
        player.ws.send(JSON.stringify({
          type: "set_ready",
          payload: { gameId, isReady: true }
        }));
        
        // Wait between ready status changes
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Wait for all updates to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Subscribe again to get final state
      const finalStatePromise = waitForMessage(players[0].ws, "game_state_update");
      players[0].ws.send(JSON.stringify({
        type: "subscribe_game",
        payload: { gameId, username: players[0].user.username }
      }));

      const finalState = await finalStatePromise;

      // Verify both players are ready
      expect(finalState.payload.playersReadyStatus).toBeDefined();
      expect(finalState.payload.playersReadyStatus).toHaveLength(2);

      // If the game has started (status is 'in-progress'), the ready status will be cleared
      // In that case, we should check that the game actually started instead
      if (finalState.payload.game_status === 'in-progress') {
        expect(finalState.payload.game_status).toBe('in-progress');
        expect(finalState.payload.game_phase).toBe('placing');
      } else {
        // If game hasn't started yet, both players should be ready
        finalState.payload.playersReadyStatus.forEach((status: any) => {
          expect(status.isReady).toBe(true);
        });
      }
    }, 15000);
  });

  describe("Game State Transitions", () => {
    test("should handle game status changes when players are ready", async () => {
      // Create 2 players
      players = await createMultiplePlayers(2);
      
      // Both players join and subscribe
      await joinPlayersToGame(players);
      
      for (const player of players) {
        const messagePromise = waitForMessage(player.ws, "game_state_update");
        player.ws.send(JSON.stringify({
          type: "subscribe_game",
          payload: { gameId, username: player.user.username }
        }));
        await messagePromise;
      }

      // Verify initial game status
      const initialStatePromise = waitForMessage(players[0].ws, "game_state_update");
      players[0].ws.send(JSON.stringify({
        type: "subscribe_game",
        payload: { gameId, username: players[0].user.username }
      }));
      
      const initialState = await initialStatePromise;
      
      // Game should be in "ready" status when full (2 players joined)
      expect(initialState.payload.game_status).toBe("ready");
    }, 10000);
  });
});
