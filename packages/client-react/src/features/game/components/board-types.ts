// Board state and game types

export interface WorkerData {
  playerId: number
  workerId: number
}

export interface CellData {
  buildingLevel: number
  worker: WorkerData | null
}

export type BoardState = CellData[][]

export interface GameState {
  currentPlayer?: number
  turn?: number
  board_state?: any // TODO: Define proper board state structure
  game_status?: string
  // Add other game state properties as needed
}

// Helper functions for board state
export const createEmptyBoard = (size: number = 5): BoardState => {
  return Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => ({
      buildingLevel: 0,
      worker: null
    }))
  )
}

export const createSampleBoard = (): BoardState => {
  const board = createEmptyBoard()

  // Add sample buildings and workers at different levels
  // Ground level workers
  board[0][0] = { buildingLevel: 0, worker: { playerId: 1, workerId: 1 } }
  board[4][4] = { buildingLevel: 0, worker: { playerId: 2, workerId: 1 } }

  // Level 1 building with worker
  board[1][1] = { buildingLevel: 1, worker: { playerId: 1, workerId: 2 } }

  // Level 2 building with worker
  board[2][2] = { buildingLevel: 2, worker: { playerId: 2, workerId: 2 } }

  // Level 3 building with worker
  board[3][1] = { buildingLevel: 3, worker: { playerId: 1, workerId: 3 } }

  // Complete tower with dome (level 4) - no worker can be on dome
  board[1][3] = { buildingLevel: 4, worker: null }

  // Some buildings without workers
  board[0][2] = { buildingLevel: 1, worker: null }
  board[4][1] = { buildingLevel: 2, worker: null }
  board[2][4] = { buildingLevel: 3, worker: null }

  return board
}

// Convert grid coordinates (0-4) to centered coordinates (-2 to +2)
export const gridToWorldCoords = (gridX: number, gridZ: number): [number, number] => {
  return [gridX - 2, gridZ - 2]
}

// Convert world coordinates (-2 to +2) to grid coordinates (0-4)
export const worldToGridCoords = (worldX: number, worldZ: number): [number, number] => {
  return [worldX + 2, worldZ + 2]
}
