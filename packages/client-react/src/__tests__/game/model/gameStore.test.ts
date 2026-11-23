import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/game/model/gameStore'
import type { BoardView, GameState } from '@/game/model/game'

const emptyBoard = (): BoardView => ({
  cells: Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => ({ height: 0, hasDome: false, worker: null })),
  ),
})

const gameStateWith = (board: BoardView): GameState => ({
  gameId: 1,
  status: 'in-progress',
  phase: 'moving',
  currentSeat: 0,
  turnNumber: 1,
  version: 1,
  board,
  players: [],
  availableMoves: [],
  isCurrentPlayer: true,
})

const boardWithWorkerAt = (x: number, y: number): BoardView => {
  const board = emptyBoard()
  board.cells[x][y].worker = { seat: 0, workerId: 1 }
  return board
}

describe('gameStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useGameStore.getState().resetGame()
    useGameStore.getState().setConnected(false)
    useGameStore.getState().setConnecting(false)
  })

  describe('initial state', () => {
    it('should have null gameState initially', () => {
      const state = useGameStore.getState()
      expect(state.gameState).toBeNull()
    })

    it('should have null gameId initially', () => {
      const state = useGameStore.getState()
      expect(state.gameId).toBeNull()
    })

    it('should have isConnected false initially', () => {
      const state = useGameStore.getState()
      expect(state.isConnected).toBe(false)
    })

    it('should have null selectedWorker initially', () => {
      const state = useGameStore.getState()
      expect(state.selectedWorker).toBeNull()
    })
  })

  describe('setGameState', () => {
    it('should update game state', () => {
      const mockGameState = gameStateWith(emptyBoard())

      useGameStore.getState().setGameState(mockGameState)

      const state = useGameStore.getState()
      expect(state.gameState).toEqual(mockGameState)
    })

    it('keeps the server board as the canonical board state', () => {
      const board = emptyBoard()
      board.cells[0][1] = { height: 1, hasDome: false, worker: null }
      board.cells[0][2] = { height: 3, hasDome: true, worker: null }

      useGameStore.getState().setGameState(gameStateWith(board))

      const cells = useGameStore.getState().gameState?.board.cells
      expect(cells?.[0][1]).toMatchObject({ height: 1, hasDome: false })
      expect(cells?.[0][2]).toMatchObject({ height: 3, hasDome: true })
    })

    it('clears the selected worker when the game changes', () => {
      const store = useGameStore.getState()
      store.setGameState(gameStateWith(boardWithWorkerAt(0, 0)))
      store.setSelectedWorker({ workerId: 1, x: 0, y: 0 })
      store.setGameState({ ...gameStateWith(emptyBoard()), gameId: 2 })

      expect(useGameStore.getState().selectedWorker).toBeNull()
    })

    it('derives worker lookup from the server board', () => {
      useGameStore.getState().setGameState(gameStateWith(boardWithWorkerAt(0, 0)))

      const state = useGameStore.getState()
      expect(state.getWorkerAt(0, 0)).toEqual({ x: 0, y: 0, seat: 0, workerId: 1 })
      expect(state.getWorkersBySeat(0)).toHaveLength(1)
    })
  })

  describe('setGameId', () => {
    it('should update game ID', () => {
      useGameStore.getState().setGameId('123')

      const state = useGameStore.getState()
      expect(state.gameId).toBe('123')
    })
  })

  describe('setSelectedWorker', () => {
    it('should set selected worker', () => {
      const worker = { workerId: 1, x: 2, y: 3 }
      useGameStore.getState().setSelectedWorker(worker)

      const state = useGameStore.getState()
      expect(state.selectedWorker).toEqual(worker)
    })

    it('should clear selected worker', () => {
      useGameStore.getState().setSelectedWorker({ workerId: 1, x: 2, y: 3 })
      useGameStore.getState().setSelectedWorker(null)

      const state = useGameStore.getState()
      expect(state.selectedWorker).toBeNull()
    })
  })

  describe('connection state', () => {
    it('should set connected state', () => {
      useGameStore.getState().setConnected(true)

      const state = useGameStore.getState()
      expect(state.isConnected).toBe(true)
      expect(state.isConnecting).toBe(false)
    })

    it('should set connecting state', () => {
      useGameStore.getState().setConnecting(true)

      const state = useGameStore.getState()
      expect(state.isConnecting).toBe(true)
    })

    it('should clear connecting when connected', () => {
      useGameStore.getState().setConnecting(true)
      useGameStore.getState().setConnected(true)

      const state = useGameStore.getState()
      expect(state.isConnected).toBe(true)
      expect(state.isConnecting).toBe(false)
    })
  })

  describe('resetGame', () => {
    it('should reset all game state', () => {
      // Set up some state
      useGameStore.getState().setGameId('123')
      useGameStore.getState().setSelectedWorker({ workerId: 1, x: 0, y: 0 })
      useGameStore.getState().setGameState({
        ...gameStateWith(emptyBoard()),
        availableMoves: [{ type: 'move_worker', workerId: 1, validPositions: [{ x: 0, y: 0 }] }]
      })

      // Reset
      useGameStore.getState().resetGame()

      const state = useGameStore.getState()
      expect(state.gameState).toBeNull()
      expect(state.gameId).toBeNull()
      expect(state.selectedWorker).toBeNull()
    })

    it('should not reset connection state', () => {
      useGameStore.getState().setConnected(true)
      useGameStore.getState().resetGame()

      const state = useGameStore.getState()
      expect(state.isConnected).toBe(true)
    })
  })

  describe('updateBoardCell', () => {
    beforeEach(() => {
      useGameStore.getState().setGameState(gameStateWith(emptyBoard()))
    })

    it('should update cell building level', () => {
      useGameStore.getState().updateBoardCell(2, 2, { buildingLevel: 2 })

      const state = useGameStore.getState()
      expect(state.gameState?.board.cells[2][2]).toMatchObject({ height: 2, hasDome: false })
    })

    it('should update cell worker', () => {
      const worker = { seat: 0, workerId: 1 }
      useGameStore.getState().updateBoardCell(1, 1, { worker })

      const state = useGameStore.getState()
      expect(state.gameState?.board.cells[1][1].worker).toEqual(worker)
    })

    it('should not update out of bounds cells', () => {
      const stateBefore = useGameStore.getState().gameState?.board

      useGameStore.getState().updateBoardCell(10, 10, { buildingLevel: 5 })

      const stateAfter = useGameStore.getState().gameState?.board
      expect(stateAfter).toEqual(stateBefore)
    })

    it('should not update negative coordinate cells', () => {
      const stateBefore = useGameStore.getState().gameState?.board

      useGameStore.getState().updateBoardCell(-1, 0, { buildingLevel: 5 })

      const stateAfter = useGameStore.getState().gameState?.board
      expect(stateAfter).toEqual(stateBefore)
    })

    it('worker lookup reflects an updated worker', () => {
      const worker = { seat: 0, workerId: 1 }
      useGameStore.getState().updateBoardCell(3, 3, { worker })

      const state = useGameStore.getState()
      expect(state.getWorkerAt(3, 3)).toEqual({ x: 3, y: 3, seat: 0, workerId: 1 })
    })
  })

  describe('moveWorker', () => {
    beforeEach(() => {
      useGameStore.getState().setGameState(gameStateWith(boardWithWorkerAt(1, 1)))
    })

    it('should move worker from one cell to another', () => {
      useGameStore.getState().moveWorker(1, 1, 2, 2, 0, 1)

      const state = useGameStore.getState()
      expect(state.gameState?.board.cells[1][1].worker).toBeNull()
      expect(state.gameState?.board.cells[2][2].worker).toEqual({
        seat: 0,
        workerId: 1,
      })
    })

    it('worker lookup reflects the move', () => {
      useGameStore.getState().moveWorker(1, 1, 2, 2, 0, 1)

      const state = useGameStore.getState()
      expect(state.getWorkerAt(1, 1)).toBeNull()
      expect(state.getWorkerAt(2, 2)).toEqual({ x: 2, y: 2, seat: 0, workerId: 1 })
    })
  })
})
