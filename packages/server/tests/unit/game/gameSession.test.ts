import * as gameSession from "../../../src/game/gameSession";
import WebSocket from "ws";

// Mock the config module
jest.mock("../../../src/configs/config", () => ({
  LOG_LEVEL: 'error'
}));

// Mock the gameRepository module
jest.mock("../../../src/game/gameRepository", () => ({
  findUsersByGame: jest.fn()
}));

import { findUsersByGame } from "../../../src/game/gameRepository";

// Mock WebSocket for testing
class MockWebSocket {
  public readyState: number = WebSocket.OPEN;
  public sentMessages: string[] = [];
  public OPEN = WebSocket.OPEN;
  public CLOSED = WebSocket.CLOSED;

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
  }
}

describe("GameSession", () => {
  const mockFindUsersByGame = findUsersByGame as jest.MockedFunction<typeof findUsersByGame>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementation - returns users based on typical test scenarios
    mockFindUsersByGame.mockImplementation(async (gameId: number) => {
      // Return mock users for the game
      return [
        { id: 100, username: 'user1', display_name: 'User 1', google_id: null, created_at: new Date(), password_hash: null, password_salt: null },
        { id: 200, username: 'user2', display_name: 'User 2', google_id: null, created_at: new Date(), password_hash: null, password_salt: null }
      ];
    });
  });

  afterEach(() => {
    // Clean up all game sessions after each test
    gameSession.clearAllGameSessions();
  });

  describe("Client Management", () => {
    test("should add clients to game session", () => {
      const gameId = 1;
      const userId = 100;
      const mockWs = new MockWebSocket() as any;

      // Add client to game session
      gameSession.addClient(gameId, userId, mockWs);

      // Verify client is tracked
      expect(gameSession.isPlayerInGameSession(gameId, userId)).toBe(true);
    });

    test("should track multiple clients in same game", () => {
      const gameId = 1;
      const userId1 = 100;
      const userId2 = 200;
      const mockWs1 = new MockWebSocket() as any;
      const mockWs2 = new MockWebSocket() as any;

      // Add both clients
      gameSession.addClient(gameId, userId1, mockWs1);
      gameSession.addClient(gameId, userId2, mockWs2);

      // Verify both clients are tracked
      expect(gameSession.isPlayerInGameSession(gameId, userId1)).toBe(true);
      expect(gameSession.isPlayerInGameSession(gameId, userId2)).toBe(true);
    });

    test("should remove clients from game session", () => {
      const gameId = 1;
      const userId = 100;
      const mockWs = new MockWebSocket() as any;

      // Add then remove client
      gameSession.addClient(gameId, userId, mockWs);
      expect(gameSession.isPlayerInGameSession(gameId, userId)).toBe(true);

      gameSession.removeClient(gameId, userId);
      expect(gameSession.isPlayerInGameSession(gameId, userId)).toBe(false);
    });

    test("should handle clients in different games", () => {
      const gameId1 = 1;
      const gameId2 = 2;
      const userId = 100;
      const mockWs1 = new MockWebSocket() as any;
      const mockWs2 = new MockWebSocket() as any;

      // Add client to both games
      gameSession.addClient(gameId1, userId, mockWs1);
      gameSession.addClient(gameId2, userId, mockWs2);

      // Verify client is tracked in both games
      expect(gameSession.isPlayerInGameSession(gameId1, userId)).toBe(true);
      expect(gameSession.isPlayerInGameSession(gameId2, userId)).toBe(true);

      // Remove from one game
      gameSession.removeClient(gameId1, userId);
      expect(gameSession.isPlayerInGameSession(gameId1, userId)).toBe(false);
      expect(gameSession.isPlayerInGameSession(gameId2, userId)).toBe(true);
    });
  });

  describe("Message Broadcasting", () => {
    test("should broadcast messages to all clients in game", () => {
      const gameId = 1;
      const userId1 = 100;
      const userId2 = 200;
      const mockWs1 = new MockWebSocket() as any;
      const mockWs2 = new MockWebSocket() as any;

      // Add clients
      gameSession.addClient(gameId, userId1, mockWs1);
      gameSession.addClient(gameId, userId2, mockWs2);

      // Broadcast message
      const testMessage = { type: "test_message", payload: "hello" };
      gameSession.broadcastUpdate(gameId, testMessage);

      // Verify both clients received the message
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(1);
      expect(JSON.parse(mockWs1.sentMessages[0])).toEqual(testMessage);
      expect(JSON.parse(mockWs2.sentMessages[0])).toEqual(testMessage);
    });

    test("should send message to specific player", () => {
      const gameId = 1;
      const userId1 = 100;
      const userId2 = 200;
      const mockWs1 = new MockWebSocket() as any;
      const mockWs2 = new MockWebSocket() as any;

      // Add clients
      gameSession.addClient(gameId, userId1, mockWs1);
      gameSession.addClient(gameId, userId2, mockWs2);

      // Send message to specific player
      const testMessage = { type: "specific_message", payload: "hello player 1" };
      gameSession.sendToPlayer(gameId, userId1, testMessage);

      // Verify only target player received the message
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(0);
      expect(JSON.parse(mockWs1.sentMessages[0])).toEqual(testMessage);
    });

    test("should handle broadcasting to non-existent game", () => {
      const gameId = 999;
      const testMessage = { type: "test_message", payload: "hello" };

      // Should not throw error when broadcasting to non-existent game
      expect(() => {
        gameSession.broadcastUpdate(gameId, testMessage);
      }).not.toThrow();
    });

    test("should handle sending to non-existent player", () => {
      const gameId = 1;
      const userId = 100;
      const testMessage = { type: "test_message", payload: "hello" };

      // Should not throw error when sending to non-existent player
      expect(() => {
        gameSession.sendToPlayer(gameId, userId, testMessage);
      }).not.toThrow();
    });

    test("should skip closed WebSocket connections", () => {
      const gameId = 1;
      const userId1 = 100;
      const userId2 = 200;
      const mockWs1 = new MockWebSocket() as any;
      const mockWs2 = new MockWebSocket() as any;

      // Add clients
      gameSession.addClient(gameId, userId1, mockWs1);
      gameSession.addClient(gameId, userId2, mockWs2);

      // Close one connection
      mockWs1.close();

      // Broadcast message
      const testMessage = { type: "test_message", payload: "hello" };
      gameSession.broadcastUpdate(gameId, testMessage);

      // Verify only open connection received the message
      expect(mockWs1.sentMessages).toHaveLength(0); // Closed connection
      expect(mockWs2.sentMessages).toHaveLength(1); // Open connection
    });
  });

  describe("Player Ready Status", () => {
    test("should track player ready status", async () => {
      const gameId = 1;
      const userId1 = 100;
      const userId2 = 200;
      const mockWs1 = new MockWebSocket() as any;
      const mockWs2 = new MockWebSocket() as any;

      // Add clients
      gameSession.addClient(gameId, userId1, mockWs1);
      gameSession.addClient(gameId, userId2, mockWs2);

      // Initially no players should be ready
      const initialStatus = await gameSession.getPlayersReadyStatus(gameId);
      expect(initialStatus).toHaveLength(2);
      expect(initialStatus.every(status => !status.isReady)).toBe(true);

      // Set one player ready
      gameSession.setPlayerReady(gameId, userId1, true);
      const updatedStatus = await gameSession.getPlayersReadyStatus(gameId);

      const player1Status = updatedStatus.find(s => s.userId === userId1);
      const player2Status = updatedStatus.find(s => s.userId === userId2);

      expect(player1Status?.isReady).toBe(true);
      expect(player2Status?.isReady).toBe(false);
    });

    test("should detect when all players are ready", async () => {
      const gameId = 1;
      const userId1 = 100;
      const userId2 = 200;
      const mockWs1 = new MockWebSocket() as any;
      const mockWs2 = new MockWebSocket() as any;

      // Add clients
      gameSession.addClient(gameId, userId1, mockWs1);
      gameSession.addClient(gameId, userId2, mockWs2);

      // Initially not all ready
      expect(await gameSession.areAllPlayersReady(gameId)).toBe(false);

      // Set one player ready
      gameSession.setPlayerReady(gameId, userId1, true);
      expect(await gameSession.areAllPlayersReady(gameId)).toBe(false);

      // Set both players ready
      gameSession.setPlayerReady(gameId, userId2, true);
      expect(await gameSession.areAllPlayersReady(gameId)).toBe(true);
    });

    test("should handle player unready", async () => {
      const gameId = 1;
      const userId = 100;
      const mockWs = new MockWebSocket() as any;

      // Mock single user for this test
      mockFindUsersByGame.mockResolvedValueOnce([
        { id: 100, username: 'user1', display_name: 'User 1', google_id: null, created_at: new Date(), password_hash: null, password_salt: null }
      ]);

      // Add client
      gameSession.addClient(gameId, userId, mockWs);

      // Set ready then unready
      gameSession.setPlayerReady(gameId, userId, true);
      const readyStatus = await gameSession.getPlayersReadyStatus(gameId);
      expect(readyStatus[0].isReady).toBe(true);

      gameSession.setPlayerReady(gameId, userId, false);
      const unreadyStatus = await gameSession.getPlayersReadyStatus(gameId);
      expect(unreadyStatus[0].isReady).toBe(false);
    });

    test("should clear player ready status", async () => {
      const gameId = 1;
      const userId = 100;
      const mockWs = new MockWebSocket() as any;

      // Mock single user for this test
      mockFindUsersByGame.mockResolvedValue([
        { id: 100, username: 'user1', display_name: 'User 1', google_id: null, created_at: new Date(), password_hash: null, password_salt: null }
      ]);

      // Add client and set ready
      gameSession.addClient(gameId, userId, mockWs);
      gameSession.setPlayerReady(gameId, userId, true);
      expect(await gameSession.areAllPlayersReady(gameId)).toBe(true);

      // Clear ready status
      gameSession.clearPlayerReadyStatus(gameId);

      // Should return array with user but not ready since ready status is cleared
      const status = await gameSession.getPlayersReadyStatus(gameId);
      expect(status).toHaveLength(1);
      expect(status[0].isReady).toBe(false);
    });

    test("should handle ready status for non-existent game", async () => {
      const gameId = 999;

      // Mock empty result for non-existent game
      mockFindUsersByGame.mockResolvedValueOnce([]);

      expect(await gameSession.getPlayersReadyStatus(gameId)).toEqual([]);
      expect(await gameSession.areAllPlayersReady(gameId)).toBe(false);
    });
  });

  describe("Connected Players Count", () => {
    test("should return correct connected players count", () => {
      const gameId = 1;
      const mockWs1 = new MockWebSocket() as any;
      const mockWs2 = new MockWebSocket() as any;

      // Initially no players
      expect(gameSession.getConnectedPlayersCount(gameId)).toBe(0);

      // Add one player
      gameSession.addClient(gameId, 100, mockWs1);
      expect(gameSession.getConnectedPlayersCount(gameId)).toBe(1);

      // Add second player
      gameSession.addClient(gameId, 200, mockWs2);
      expect(gameSession.getConnectedPlayersCount(gameId)).toBe(2);

      // Remove one player
      gameSession.removeClient(gameId, 100);
      expect(gameSession.getConnectedPlayersCount(gameId)).toBe(1);
    });
  });
});
