/**
 * Tests for Board Rendering Logic
 * 
 * Tests the board state transformations and rendering logic
 * without requiring full 3D rendering
 */

import { describe, it, expect } from 'vitest'
import {
  createEmptyBoard,
  createSampleBoard,
  gridToWorldCoords,
  worldToGridCoords
} from '../../../features/game/components/board-types'
import {
  createMockBoardState,
  addWorkerToBoardState,
  addBuildingToBoardState,
} from '../../helpers/r3f-test-utils'

describe('Board State Creation', () => {
  it('should create empty 5x5 board', () => {
    const board = createEmptyBoard()
    
    expect(board).toHaveLength(5)
    expect(board[0]).toHaveLength(5)
    
    // Check all cells are empty
    board.forEach(row => {
      row.forEach(cell => {
        expect(cell.buildingLevel).toBe(0)
        expect(cell.worker).toBeNull()
      })
    })
  })

  it('should create sample board with buildings and workers', () => {
    const board = createSampleBoard()
    
    expect(board).toHaveLength(5)
    
    // Sample board should have some buildings
    let hasBuildingsCount = 0
    let hasWorkersCount = 0
    
    board.forEach(row => {
      row.forEach(cell => {
        if (cell.buildingLevel > 0) hasBuildingsCount++
        if (cell.worker) hasWorkersCount++
      })
    })
    
    expect(hasBuildingsCount).toBeGreaterThan(0)
    expect(hasWorkersCount).toBeGreaterThan(0)
  })
})

describe('Coordinate Conversion', () => {
  it('should convert grid to world coordinates', () => {
    // Grid (0,0) should map to world (-2, -2)
    expect(gridToWorldCoords(0, 0)).toEqual([-2, -2])
    
    // Grid (2,2) should map to world (0, 0) - center
    expect(gridToWorldCoords(2, 2)).toEqual([0, 0])
    
    // Grid (4,4) should map to world (2, 2)
    expect(gridToWorldCoords(4, 4)).toEqual([2, 2])
  })

  it('should convert world to grid coordinates', () => {
    // World (-2, -2) should map to grid (0, 0)
    expect(worldToGridCoords(-2, -2)).toEqual([0, 0])
    
    // World (0, 0) should map to grid (2, 2) - center
    expect(worldToGridCoords(0, 0)).toEqual([2, 2])
    
    // World (2, 2) should map to grid (4, 4)
    expect(worldToGridCoords(2, 2)).toEqual([4, 4])
  })

  it('should round-trip convert coordinates', () => {
    for (let gridX = 0; gridX < 5; gridX++) {
      for (let gridZ = 0; gridZ < 5; gridZ++) {
        const [worldX, worldZ] = gridToWorldCoords(gridX, gridZ)
        const [backToGridX, backToGridZ] = worldToGridCoords(worldX, worldZ)
        
        expect(backToGridX).toBe(gridX)
        expect(backToGridZ).toBe(gridZ)
      }
    }
  })
})

describe('Board State Helpers', () => {
  it('should create mock board state', () => {
    const board = createMockBoardState()
    
    expect(board).toHaveLength(5)
    expect(board[0]).toHaveLength(5)
  })

  it('should add worker to board state', () => {
    const board = createMockBoardState()
    const boardWithWorker = addWorkerToBoardState(board, 2, 3, 1, 1)
    
    expect(boardWithWorker[2][3].worker).toEqual({
      playerId: 1,
      workerId: 1,
    })
    
    // Original board should be unchanged
    expect(board[2][3].worker).toBeNull()
  })

  it('should add building to board state', () => {
    const board = createMockBoardState()
    const boardWithBuilding = addBuildingToBoardState(board, 1, 1, 3)
    
    expect(boardWithBuilding[1][1].buildingLevel).toBe(3)
    
    // Original board should be unchanged
    expect(board[1][1].buildingLevel).toBe(0)
  })

  it('should add multiple workers to different positions', () => {
    let board = createMockBoardState()
    
    board = addWorkerToBoardState(board, 0, 0, 1, 1)
    board = addWorkerToBoardState(board, 0, 4, 1, 2)
    board = addWorkerToBoardState(board, 4, 0, 2, 1)
    board = addWorkerToBoardState(board, 4, 4, 2, 2)
    
    expect(board[0][0].worker).toEqual({ playerId: 1, workerId: 1 })
    expect(board[0][4].worker).toEqual({ playerId: 1, workerId: 2 })
    expect(board[4][0].worker).toEqual({ playerId: 2, workerId: 1 })
    expect(board[4][4].worker).toEqual({ playerId: 2, workerId: 2 })
  })

  it('should add buildings of different levels', () => {
    let board = createMockBoardState()
    
    board = addBuildingToBoardState(board, 1, 1, 1)
    board = addBuildingToBoardState(board, 2, 2, 2)
    board = addBuildingToBoardState(board, 3, 3, 3)
    board = addBuildingToBoardState(board, 4, 4, 4)
    
    expect(board[1][1].buildingLevel).toBe(1)
    expect(board[2][2].buildingLevel).toBe(2)
    expect(board[3][3].buildingLevel).toBe(3)
    expect(board[4][4].buildingLevel).toBe(4)
  })
})

describe('Board Rendering Logic', () => {
  it('should calculate correct number of blocks to render', () => {
    const board = createMockBoardState()
    const boardWithBuildings = addBuildingToBoardState(
      addBuildingToBoardState(board, 0, 0, 3),
      1, 1, 2
    )
    
    // Count total blocks that should be rendered
    let totalBlocks = 0
    boardWithBuildings.forEach(row => {
      row.forEach(cell => {
        totalBlocks += cell.buildingLevel
      })
    })
    
    expect(totalBlocks).toBe(5) // 3 + 2
  })

  it('should identify cells with workers', () => {
    const board = createMockBoardState()
    const boardWithWorkers = addWorkerToBoardState(
      addWorkerToBoardState(board, 1, 1, 1, 1),
      3, 3, 2, 1
    )
    
    let workerCount = 0
    boardWithWorkers.forEach(row => {
      row.forEach(cell => {
        if (cell.worker) workerCount++
      })
    })
    
    expect(workerCount).toBe(2)
  })

  it('should handle complex board state', () => {
    let board = createMockBoardState()
    
    // Add buildings
    board = addBuildingToBoardState(board, 2, 2, 4) // Dome in center
    board = addBuildingToBoardState(board, 1, 2, 2)
    board = addBuildingToBoardState(board, 3, 2, 1)
    
    // Add workers
    board = addWorkerToBoardState(board, 0, 0, 1, 1)
    board = addWorkerToBoardState(board, 4, 4, 2, 1)
    
    // Verify state
    expect(board[2][2].buildingLevel).toBe(4)
    expect(board[0][0].worker).toBeTruthy()
    expect(board[4][4].worker).toBeTruthy()
    
    // Count total elements
    let buildings = 0
    let workers = 0
    board.forEach(row => {
      row.forEach(cell => {
        buildings += cell.buildingLevel
        if (cell.worker) workers++
      })
    })
    
    expect(buildings).toBe(7) // 4 + 2 + 1
    expect(workers).toBe(2)
  })
})

