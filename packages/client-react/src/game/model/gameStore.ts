import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { EMPTY_AVAILABLE_MOVES } from './game'
import type { BoardView, GameState } from './game'

export interface BoardCell {
  buildingLevel: number
  worker: {
    seat: number
    workerId: number
  } | null
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'reconnecting' | 'connected' | 'failed'

interface WorkerPosition {
  x: number
  y: number
  seat: number
  workerId: number
}

interface GameStore {
  // GameView is the canonical server snapshot. Board and turn data are derived from it.
  gameState: GameState | null
  gameId: string | null
  selectedWorker: { workerId: number; x: number; y: number } | null

  isConnected: boolean
  isConnecting: boolean
  connectionStatus: ConnectionStatus
  reconnectAttempt: number
  maxReconnectAttempts: number

  setGameState: (gameState: GameState | null) => void
  setGameId: (gameId: string) => void
  setSelectedWorker: (worker: { workerId: number; x: number; y: number } | null) => void
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setConnectionStatus: (status: ConnectionStatus, attempt?: number, maxAttempts?: number) => void
  resetGame: () => void

  updateBoardCell: (x: number, y: number, cell: Partial<BoardCell>) => void
  moveWorker: (fromX: number, fromY: number, toX: number, toY: number, seat: number, workerId: number) => void
  getBoardCell: (x: number, y: number) => BoardCell | null
  getWorkerAt: (x: number, y: number) => WorkerPosition | null
  getWorkersBySeat: (seat: number) => WorkerPosition[]
  getMovableWorkers: (currentSeat: number) => WorkerPosition[]
}

const toBoardCell = (cell: BoardView['cells'][number][number]): BoardCell => ({
  buildingLevel: cell.hasDome ? cell.height + 1 : cell.height,
  worker: cell.worker ? { ...cell.worker } : null
})

const getCell = (state: GameStore, x: number, y: number) => state.gameState?.board.cells[x]?.[y] ?? null

const getWorkers = (state: GameStore, seat?: number): WorkerPosition[] => {
  const workers: WorkerPosition[] = []
  state.gameState?.board.cells.forEach((row, x) => row.forEach((cell, y) => {
    if (cell.worker && (seat === undefined || cell.worker.seat === seat)) {
      workers.push({ x, y, ...cell.worker })
    }
  }))
  return workers
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    gameState: null,
    gameId: null,
    selectedWorker: null,
    isConnected: false,
    isConnecting: false,
    connectionStatus: 'disconnected',
    reconnectAttempt: 0,
    maxReconnectAttempts: 5,

    setGameState: (gameState) => set((state) => {
      const gameChanged = state.gameState?.gameId !== gameState?.gameId
      const selectedWorker = state.selectedWorker
      const workerStillHasActions = selectedWorker && gameState?.isCurrentPlayer &&
        gameState.availableMoves.some((move) => move.workerId === selectedWorker.workerId)
      return { gameState, selectedWorker: !gameChanged && workerStillHasActions ? selectedWorker : null }
    }),

    setGameId: (gameId) => set((state) => ({
      gameId,
      selectedWorker: state.gameId === gameId ? state.selectedWorker : null
    })),

    setSelectedWorker: (selectedWorker) => set({ selectedWorker }),

    setConnected: (isConnected) => set({ isConnected, isConnecting: false }),
    setConnecting: (isConnecting) => set({ isConnecting }),
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
      selectedWorker: null
    }),

    updateBoardCell: (x, y, update) => set((state) => {
      const board = state.gameState?.board
      const current = board?.cells[x]?.[y]
      if (!board || !current || x < 0 || x >= 5 || y < 0 || y >= 5) return state

      const cells = board.cells.map((row, rowIndex) => rowIndex === x
        ? row.map((cell, colIndex) => {
          if (colIndex !== y) return cell
          const buildingLevel = update.buildingLevel ?? (cell.hasDome ? cell.height + 1 : cell.height)
          return {
            height: Math.min(buildingLevel, 3),
            hasDome: buildingLevel >= 4,
            worker: update.worker === undefined ? cell.worker : update.worker
          }
        })
        : row)

      return { gameState: { ...state.gameState!, board: { cells } } }
    }),

    moveWorker: (fromX, fromY, toX, toY, seat, workerId) => set((state) => {
      const board = state.gameState?.board
      if (!board?.cells[fromX]?.[fromY] || !board.cells[toX]?.[toY]) return state
      const cells = board.cells.map((row) => row.map((cell) => ({ ...cell })))
      cells[fromX][fromY].worker = null
      cells[toX][toY].worker = { seat, workerId }
      return { gameState: { ...state.gameState!, board: { cells } } }
    }),

    getBoardCell: (x, y) => {
      const cell = getCell(get(), x, y)
      return cell ? toBoardCell(cell) : null
    },

    getWorkerAt: (x, y) => {
      const worker = getCell(get(), x, y)?.worker
      return worker ? { x, y, ...worker } : null
    },

    getWorkersBySeat: (seat) => getWorkers(get(), seat),

    getMovableWorkers: (currentSeat) => {
      const moves = get().gameState?.availableMoves ?? EMPTY_AVAILABLE_MOVES
      const movableIds = new Set(moves.filter((move) => move.type === 'move_worker').map((move) => move.workerId))
      return getWorkers(get(), currentSeat).filter((worker) => movableIds.has(worker.workerId))
    }
  }))
)

export const useBoardCell = (x: number, y: number) =>
  useGameStore((state) => {
    const cell = getCell(state, x, y)
    return cell ? toBoardCell(cell) : null
  })

export const useWorkerAt = (x: number, y: number) =>
  useGameStore((state) => {
    const worker = getCell(state, x, y)?.worker
    return worker ? { x, y, ...worker } : null
  })
