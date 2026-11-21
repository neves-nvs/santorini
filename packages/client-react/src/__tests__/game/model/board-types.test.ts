import { describe, it, expect } from 'vitest'
import {
  createEmptyBoard,
  createSampleBoard,
} from '@/game/model/board-types'

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
    expect(board[0][0].worker).toEqual({ seat: 0, workerId: 1 })
    expect(board[0][0].buildingLevel).toBe(0)

    expect(board[4][4].worker).toEqual({ seat: 1, workerId: 1 })
    expect(board[4][4].buildingLevel).toBe(0)
  })

  it('should place workers on level 1 building', () => {
    const board = createSampleBoard()

    expect(board[1][1].buildingLevel).toBe(1)
    expect(board[1][1].worker).toEqual({ seat: 0, workerId: 2 })
  })

  it('should place workers on level 2 building', () => {
    const board = createSampleBoard()

    expect(board[2][2].buildingLevel).toBe(2)
    expect(board[2][2].worker).toEqual({ seat: 1, workerId: 2 })
  })

  it('should place workers on level 3 building', () => {
    const board = createSampleBoard()

    expect(board[3][1].buildingLevel).toBe(3)
    expect(board[3][1].worker).toEqual({ seat: 0, workerId: 3 })
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
          if (worker.seat === 0) player1Workers.push(worker)
          if (worker.seat === 1) player2Workers.push(worker)
        }
      }
    }

    expect(player1Workers.length).toBeGreaterThan(1)
    expect(player2Workers.length).toBeGreaterThan(1)
  })
})
