import { getAvailablePlays } from '../../../src/game/turnManager';
import { createEmptyBoard, saveBoardState } from '../../../src/game/boardState';
import * as gameRepository from '../../../src/game/gameRepository';

// Mock the database
jest.mock('../../../src/database', () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    executeTakeFirst: jest.fn(),
    insertInto: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]), // Mock empty pieces array
    updateTable: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    deleteFrom: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    returningAll: jest.fn().mockReturnThis(),
    executeTakeFirstOrThrow: jest.fn(),
  }
}));

describe('Blocked Player Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should end 2-player game when player is blocked', async () => {
    // Arrange
    const gameId = 1;
    const blockedPlayerId = 1;
    
    const boardState = createEmptyBoard();
    // No workers for player 1 = blocked

    // Mock database calls
    const mockGame = {
      id: gameId,
      current_player_id: blockedPlayerId,
      game_phase: 'moving',
      turn_number: 5,
      placing_turns_completed: 4,
      game_status: 'in-progress'
    };

    jest.spyOn(gameRepository, 'findGameById').mockResolvedValue(mockGame as any);
    jest.spyOn(gameRepository, 'findPlayersByGameId').mockResolvedValue([1, 2]);
    jest.spyOn(gameRepository, 'updateGame').mockResolvedValue(undefined);
    
    // Mock getCurrentTurnState
    jest.spyOn(require('../../../src/game/turnManager'), 'getCurrentTurnState').mockResolvedValue({
      gameId,
      currentPlayerId: blockedPlayerId,
      currentPhase: 'moving',
      turnNumber: 5,
      placingTurnsCompleted: 4,
      isGameOver: false
    });
    
    // Mock loadBoardState
    jest.spyOn(require('../../../src/game/boardState'), 'loadBoardState').mockResolvedValue(boardState);

    await saveBoardState(gameId, boardState);

    // Act
    const result = await getAvailablePlays(gameId);

    // Assert
    expect(result).toEqual([]);
    expect(gameRepository.updateGame).toHaveBeenCalledWith(gameId, {
      game_status: 'completed',
      winner_id: 2,
      win_reason: 'last_player_standing'
    });
  });

  it('should handle blocked player during building phase', async () => {
    // Arrange
    const gameId = 2;
    const blockedPlayerId = 1;

    const boardState = createEmptyBoard();

    // Place player 1's worker at (2,2) - the worker that just moved
    boardState.cells[2][2].worker = { playerId: 1, workerId: 1 };
    boardState.workers.set("1-1", { x: 2, y: 2, playerId: 1 });

    // Block all adjacent positions so the worker cannot build anywhere
    const adjacentPositions = [
      [1,1], [1,2], [1,3],
      [2,1],        [2,3],
      [3,1], [3,2], [3,3]
    ];

    for (const [x, y] of adjacentPositions) {
      boardState.cells[x][y].worker = { playerId: 2, workerId: 1 };
    }

    // Mock database calls
    const mockGame = {
      id: gameId,
      current_player_id: blockedPlayerId,
      game_phase: 'building',
      turn_number: 5,
      placing_turns_completed: 4,
      game_status: 'in-progress'
    };

    jest.spyOn(gameRepository, 'findGameById').mockResolvedValue(mockGame as any);
    jest.spyOn(gameRepository, 'findPlayersByGameId').mockResolvedValue([1, 2]);
    jest.spyOn(gameRepository, 'updateGame').mockResolvedValue(undefined);

    // Mock getCurrentTurnState
    jest.spyOn(require('../../../src/game/turnManager'), 'getCurrentTurnState').mockResolvedValue({
      gameId,
      currentPlayerId: blockedPlayerId,
      currentPhase: 'building',
      turnNumber: 5,
      placingTurnsCompleted: 4,
      isGameOver: false,
      lastMovedWorkerId: 1,
      lastMovedWorkerPosition: { x: 2, y: 2 }
    });

    // Mock loadBoardState
    jest.spyOn(require('../../../src/game/boardState'), 'loadBoardState').mockResolvedValue(boardState);

    await saveBoardState(gameId, boardState);

    // Act
    const result = await getAvailablePlays(gameId);

    // Assert
    expect(result).toEqual([]);
    expect(gameRepository.updateGame).toHaveBeenCalledWith(gameId, {
      game_status: 'completed',
      winner_id: 2,
      win_reason: 'last_player_standing'
    });
  });
});
