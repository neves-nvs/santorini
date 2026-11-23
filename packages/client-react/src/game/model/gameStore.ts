import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { AvailableMove, BoardView, GameState } from './game'

// Board cell data for optimized 3D rendering
export interface BoardCell {
  buildingLevel: number
  worker: {
    seat: number
    workerId: number
  } | null
}

// Optimized board state for R3F
export interface OptimizedBoardState {
  cells: BoardCell[][]
  lastUpdated: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'reconnecting' | 'connected' | 'failed'

// Worker position for efficient lookups
interface WorkerPosition {
  x: number
  y: number
  seat: number
  workerId: number
}

// Game store state
interface GameStore {
  // Core game data
  gameState: GameState | null
  gameId: string | null

  // Optimized board state for 3D rendering
  boardState: OptimizedBoardState | null

  // Workers indexed by position for fast lookups
  workersByPosition: Map<string, WorkerPosition>
  workersBySeat: Map<number, WorkerPosition[]>

  // Turn and move state
  currentPlayerMoves: AvailableMove[]
  isMyTurn: boolean
  selectedWorker: { workerId: number; x: number; y: number } | null

  // Connection state
  isConnected: boolean
  isConnecting: boolean
  connectionStatus: ConnectionStatus
  reconnectAttempt: number
  maxReconnectAttempts: number

  // Actions
  setGameState: (gameState: GameState | null) => void
  setGameId: (gameId: string) => void
  setCurrentPlayerMoves: (moves: AvailableMove[]) => void
  setMyTurn: (isMyTurn: boolean) => void
  setSelectedWorker: (worker: { workerId: number; x: number; y: number } | null) => void
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setConnectionStatus: (status: ConnectionStatus, attempt?: number, maxAttempts?: number) => void
  resetGame: () => void
  
  // Optimized board operations
  updateBoardCell: (x: number, y: number, cell: Partial<BoardCell>) => void
  moveWorker: (fromX: number, fromY: number, toX: number, toY: number, seat: number, workerId: number) => void
  
  // Selectors (computed values)
  getBoardCell: (x: number, y: number) => BoardCell | null
  getWorkerAt: (x: number, y: number) => WorkerPosition | null
  getWorkersBySeat: (seat: number) => WorkerPosition[]
  getMovableWorkers: (currentSeat: number) => WorkerPosition[]
}

// Helper function to parse server board to optimized format
// Backend sends board.cells as CellView[][] (2D array)
const parseServerBoardToOptimized = (serverBoard: BoardView): OptimizedBoardState => {
  const cells: BoardCell[][] = Array(5).fill(null).map(() =>
    Array(5).fill(null).map(() => ({
      buildingLevel: 0,
      worker: null
    }))
  )

  // Handle new format: board.cells is a 2D array of CellView
  if (serverBoard?.cells && Array.isArray(serverBoard.cells)) {
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const cell = serverBoard.cells[x]?.[y]
        if (cell) {
          // Server sends height (0-3) + hasDome. Convert to buildingLevel 0-4
          const height = cell.height || 0
          cells[x][y] = {
            buildingLevel: cell.hasDome ? height + 1 : height,
            worker: cell.worker ? {
              seat: cell.worker.seat,
              workerId: cell.worker.workerId
            } : null
          }
        }
      }
    }
  }

  return {
    cells,
    lastUpdated: Date.now()
  }
}

// Helper function to build worker indices
const buildWorkerIndices = (boardState: OptimizedBoardState) => {
  const workersByPosition = new Map<string, WorkerPosition>()
  const workersBySeat = new Map<number, WorkerPosition[]>()

  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      const cell = boardState.cells[x][y]
      if (cell.worker) {
        const worker: WorkerPosition = {
          x,
          y,
          seat: cell.worker.seat,
          workerId: cell.worker.workerId
        }
        
        // Index by position
        workersByPosition.set(`${x},${y}`, worker)
        
        // Index by player
        if (!workersBySeat.has(worker.seat)) {
          workersBySeat.set(worker.seat, [])
        }
        workersBySeat.get(worker.seat)!.push(worker)
      }
    }
  }

  return { workersByPosition, workersBySeat }
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gameState: null,
    gameId: null,
    boardState: null,
    workersByPosition: new Map(),
    workersBySeat: new Map(),
    currentPlayerMoves: [],
    isMyTurn: false,
    selectedWorker: null,
    isConnected: false,
    isConnecting: false,
    connectionStatus: 'disconnected',
    reconnectAttempt: 0,
    maxReconnectAttempts: 5,

    // Actions
    setGameState: (gameState: GameState | null) => {
      if (!gameState) {
        set({
          gameState: null,
          boardState: null,
          workersByPosition: new Map(),
          workersBySeat: new Map()
        })
        return
      }

      const currentState = get()

      // Only reparse board if it actually changed
      let boardState = currentState.boardState
      let indices = { workersByPosition: currentState.workersByPosition, workersBySeat: currentState.workersBySeat }

      const boardChanged = !currentState.gameState?.board ||
        JSON.stringify(currentState.gameState.board) !== JSON.stringify(gameState.board)

      if (boardChanged && gameState.board) {
        boardState = parseServerBoardToOptimized(gameState.board)
        indices = buildWorkerIndices(boardState)
      }

      set({
        gameState,
        boardState,
        workersByPosition: indices.workersByPosition,
        workersBySeat: indices.workersBySeat
      })
    },

    setGameId: (gameId: string) => set({ gameId }),

    setCurrentPlayerMoves: (moves: AvailableMove[]) => set({
      currentPlayerMoves: Array.isArray(moves) ? moves : []
    }),

    setMyTurn: (isMyTurn: boolean) => set({ isMyTurn }),

    setSelectedWorker: (worker) => set({ selectedWorker: worker }),

    setConnected: (connected: boolean) => set({ 
      isConnected: connected, 
      isConnecting: false 
    }),

    setConnecting: (connecting: boolean) => set({ isConnecting: connecting }),

    setConnectionStatus: (connectionStatus, reconnectAttempt = 0, maxReconnectAttempts = 5) => set({
      connectionStatus,
      reconnectAttempt,
      maxReconnectAttempts,
      isConnected: connectionStatus === 'connected',
      isConnecting: connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
    }),

    resetGame: () => set({
      gameState: null,
      gameId: null,
      boardState: null,
      workersByPosition: new Map(),
      workersBySeat: new Map(),
      currentPlayerMoves: [],
      isMyTurn: false,
      selectedWorker: null
    }),

    // Optimized board operations
    updateBoardCell: (x: number, y: number, cellUpdate: Partial<BoardCell>) => {
      const state = get()
      if (!state.boardState || x < 0 || x >= 5 || y < 0 || y >= 5) return

      const newCells = state.boardState.cells.map((row, rowIndex) =>
        rowIndex === x ? row.map((cell, colIndex) =>
          colIndex === y ? { ...cell, ...cellUpdate } : cell
        ) : row
      )

      const newBoardState = {
        cells: newCells,
        lastUpdated: Date.now()
      }

      const indices = buildWorkerIndices(newBoardState)
      
      set({
        boardState: newBoardState,
        workersByPosition: indices.workersByPosition,
        workersBySeat: indices.workersBySeat
      })
    },

    moveWorker: (fromX: number, fromY: number, toX: number, toY: number, seat: number, workerId: number) => {
      const state = get()
      if (!state.boardState) return

      const newCells = state.boardState.cells.map(row => row.map(cell => ({ ...cell })))
      
      // Remove worker from old position
      newCells[fromX][fromY].worker = null
      
      // Add worker to new position
      newCells[toX][toY].worker = { seat, workerId }

      const newBoardState = {
        cells: newCells,
        lastUpdated: Date.now()
      }

      const indices = buildWorkerIndices(newBoardState)
      
      set({
        boardState: newBoardState,
        workersByPosition: indices.workersByPosition,
        workersBySeat: indices.workersBySeat
      })
    },

    // Selectors
    getBoardCell: (x: number, y: number) => {
      const state = get()
      if (!state.boardState || x < 0 || x >= 5 || y < 0 || y >= 5) return null
      return state.boardState.cells[x][y]
    },

    getWorkerAt: (x: number, y: number) => {
      const state = get()
      return state.workersByPosition.get(`${x},${y}`) || null
    },

    getWorkersBySeat: (seat: number) => {
      const state = get()
      return state.workersBySeat.get(seat) || []
    },

    getMovableWorkers: (currentSeat: number) => {
      const state = get()
      const playerWorkers = state.workersBySeat.get(currentSeat) || []
      const moveWorkerMoves = state.currentPlayerMoves.filter(move => move.type === 'move_worker')
      
      return playerWorkers.filter(worker =>
        moveWorkerMoves.some(move => move.workerId === worker.workerId)
      )
    }
  }))
)

// Optimized selectors for R3F components
export const useBoardCell = (x: number, y: number) => 
  useGameStore(state => state.boardState?.cells[x]?.[y] || null)

export const useWorkerAt = (x: number, y: number) => 
  useGameStore(state => state.workersByPosition.get(`${x},${y}`) || null)

export const useCurrentPlayerMoves = () => 
  useGameStore(state => state.currentPlayerMoves)

export const useSelectedWorker = () => 
  useGameStore(state => state.selectedWorker)

export const useIsMyTurn = () => 
  useGameStore(state => state.isMyTurn)

export const useBoardLastUpdated = () => 
  useGameStore(state => state.boardState?.lastUpdated || 0)
