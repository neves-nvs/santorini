import { describe, it, expect } from 'vitest'
import {
  createEmptyBoard,
  createSampleBoard,
  gridToWorldCoords,
  worldToGridCoords,
} from '../../features/game/components/board-types'

describe('createEmptyBoard', () => {
  it('should create a 5x5 board by default', () => {
    const board = createEmptyBoard()

    expect(board).toHaveLength(5)
    expect(board[0]).toHaveLength(5)
  })

  it('should create board with custom size', () => {
    const board = createEmptyBoard(3)

    expect(board).toHaveLength(3)
    expect(board[0]).toHaveLength(3)
  })

  it('should initialize all cells with buildingLevel 0', () => {
    const board = createEmptyBoard()

    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        expect(board[x][y].buildingLevel).toBe(0)
      }
    }
  })

  it('should initialize all cells with no workers', () => {
    const board = createEmptyBoard()

    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        expect(board[x][y].worker).toBeNull()
      }
    }
  })

  it('should create independent cell objects', () => {
    const board = createEmptyBoard()

    // Modify one cell
    board[0][0].buildingLevel = 3

    // Other cells should not be affected
    expect(board[0][1].buildingLevel).toBe(0)
    expect(board[1][0].buildingLevel).toBe(0)
  })
})

describe('createSampleBoard', () => {
  it('should create a 5x5 board', () => {
    const board = createSampleBoard()

    expect(board).toHaveLength(5)
    expect(board[0]).toHaveLength(5)
  })

  it('should place workers at ground level', () => {
    const board = createSampleBoard()

    // Ground level workers
    expect(board[0][0].worker).toEqual({ playerId: 1, workerId: 1 })
    expect(board[0][0].buildingLevel).toBe(0)

    expect(board[4][4].worker).toEqual({ playerId: 2, workerId: 1 })
    expect(board[4][4].buildingLevel).toBe(0)
  })

  it('should place workers on level 1 building', () => {
    const board = createSampleBoard()

    expect(board[1][1].buildingLevel).toBe(1)
    expect(board[1][1].worker).toEqual({ playerId: 1, workerId: 2 })
  })

  it('should place workers on level 2 building', () => {
    const board = createSampleBoard()

    expect(board[2][2].buildingLevel).toBe(2)
    expect(board[2][2].worker).toEqual({ playerId: 2, workerId: 2 })
  })

  it('should place workers on level 3 building', () => {
    const board = createSampleBoard()

    expect(board[3][1].buildingLevel).toBe(3)
    expect(board[3][1].worker).toEqual({ playerId: 1, workerId: 3 })
  })

  it('should create complete tower with dome (level 4)', () => {
    const board = createSampleBoard()

    expect(board[1][3].buildingLevel).toBe(4)
    expect(board[1][3].worker).toBeNull()
  })

  it('should create buildings without workers', () => {
    const board = createSampleBoard()

    // Level 1 building without worker
    expect(board[0][2].buildingLevel).toBe(1)
    expect(board[0][2].worker).toBeNull()

    // Level 2 building without worker
    expect(board[4][1].buildingLevel).toBe(2)
    expect(board[4][1].worker).toBeNull()

    // Level 3 building without worker
    expect(board[2][4].buildingLevel).toBe(3)
    expect(board[2][4].worker).toBeNull()
  })

  it('should have multiple workers per player', () => {
    const board = createSampleBoard()

    const player1Workers = []
    const player2Workers = []

    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const worker = board[x][y].worker
        if (worker) {
          if (worker.playerId === 1) player1Workers.push(worker)
          if (worker.playerId === 2) player2Workers.push(worker)
        }
      }
    }

    expect(player1Workers.length).toBeGreaterThan(1)
    expect(player2Workers.length).toBeGreaterThan(1)
  })
})

describe('gridToWorldCoords', () => {
  it('should convert grid (0,0) to world (-2,-2)', () => {
    const [worldX, worldZ] = gridToWorldCoords(0, 0)

    expect(worldX).toBe(-2)
    expect(worldZ).toBe(-2)
  })

  it('should convert grid (2,2) to world (0,0)', () => {
    const [worldX, worldZ] = gridToWorldCoords(2, 2)

    expect(worldX).toBe(0)
    expect(worldZ).toBe(0)
  })

  it('should convert grid (4,4) to world (2,2)', () => {
    const [worldX, worldZ] = gridToWorldCoords(4, 4)

    expect(worldX).toBe(2)
    expect(worldZ).toBe(2)
  })

  it('should convert grid (1,3) to world (-1,1)', () => {
    const [worldX, worldZ] = gridToWorldCoords(1, 3)

    expect(worldX).toBe(-1)
    expect(worldZ).toBe(1)
  })

  it('should handle all grid positions correctly', () => {
    for (let gridX = 0; gridX < 5; gridX++) {
      for (let gridZ = 0; gridZ < 5; gridZ++) {
        const [worldX, worldZ] = gridToWorldCoords(gridX, gridZ)
        
        expect(worldX).toBe(gridX - 2)
        expect(worldZ).toBe(gridZ - 2)
      }
    }
  })
})

describe('worldToGridCoords', () => {
  it('should convert world (-2,-2) to grid (0,0)', () => {
    const [gridX, gridZ] = worldToGridCoords(-2, -2)

    expect(gridX).toBe(0)
    expect(gridZ).toBe(0)
  })

  it('should convert world (0,0) to grid (2,2)', () => {
    const [gridX, gridZ] = worldToGridCoords(0, 0)

    expect(gridX).toBe(2)
    expect(gridZ).toBe(2)
  })

  it('should convert world (2,2) to grid (4,4)', () => {
    const [gridX, gridZ] = worldToGridCoords(2, 2)

    expect(gridX).toBe(4)
    expect(gridZ).toBe(4)
  })

  it('should convert world (-1,1) to grid (1,3)', () => {
    const [gridX, gridZ] = worldToGridCoords(-1, 1)

    expect(gridX).toBe(1)
    expect(gridZ).toBe(3)
  })

  it('should handle all world positions correctly', () => {
    for (let worldX = -2; worldX <= 2; worldX++) {
      for (let worldZ = -2; worldZ <= 2; worldZ++) {
        const [gridX, gridZ] = worldToGridCoords(worldX, worldZ)
        
        expect(gridX).toBe(worldX + 2)
        expect(gridZ).toBe(worldZ + 2)
      }
    }
  })
})

describe('coordinate conversion round-trip', () => {
  it('should convert grid -> world -> grid correctly', () => {
    for (let gridX = 0; gridX < 5; gridX++) {
      for (let gridZ = 0; gridZ < 5; gridZ++) {
        const [worldX, worldZ] = gridToWorldCoords(gridX, gridZ)
        const [backToGridX, backToGridZ] = worldToGridCoords(worldX, worldZ)
        
        expect(backToGridX).toBe(gridX)
        expect(backToGridZ).toBe(gridZ)
      }
    }
  })

  it('should convert world -> grid -> world correctly', () => {
    for (let worldX = -2; worldX <= 2; worldX++) {
      for (let worldZ = -2; worldZ <= 2; worldZ++) {
        const [gridX, gridZ] = worldToGridCoords(worldX, worldZ)
        const [backToWorldX, backToWorldZ] = gridToWorldCoords(gridX, gridZ)
        
        expect(backToWorldX).toBe(worldX)
        expect(backToWorldZ).toBe(worldZ)
      }
    }
  })
})

