import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/game/model/gameStore'
import type { AvailableMove, BoardView, GameState } from '@/game/model/game'

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
  isCurrentPlayer: true,
})

const boardWithWorkerAt = (x: number, y: number): BoardView => {
  const board = emptyBoard()
  board.cells[x][y].worker = { seat: 0, workerId: 1 }
  return board
}

const moveWorkerTo = (x: number, y: number): AvailableMove => ({
  type: 'move_worker',
  workerId: 1,
  validPositions: [{ x, y }],
})

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

    it('should have empty currentPlayerMoves initially', () => {
      const state = useGameStore.getState()
      expect(state.currentPlayerMoves).toEqual([])
    })

    it('should have isMyTurn false initially', () => {
      const state = useGameStore.getState()
      expect(state.isMyTurn).toBe(false)
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

    it('should parse the board, turning a dome into an extra building level', () => {
      const board = emptyBoard()
      board.cells[0][1] = { height: 1, hasDome: false, worker: null }
      board.cells[0][2] = { height: 3, hasDome: true, worker: null }

      useGameStore.getState().setGameState(gameStateWith(board))

      const cells = useGameStore.getState().boardState?.cells
      expect(cells?.[0][1].buildingLevel).toBe(1)
      expect(cells?.[0][2].buildingLevel).toBe(4)
    })

    it('should build worker indices when game state has workers', () => {
      useGameStore.getState().setGameState(gameStateWith(boardWithWorkerAt(0, 0)))

      const state = useGameStore.getState()
      expect(state.workersByPosition.get('0,0')).toEqual({ x: 0, y: 0, seat: 0, workerId: 1 })
      expect(state.workersBySeat.get(0)).toHaveLength(1)
    })
  })

  describe('setGameId', () => {
    it('should update game ID', () => {
      useGameStore.getState().setGameId('123')

      const state = useGameStore.getState()
      expect(state.gameId).toBe('123')
    })
  })

  describe('setCurrentPlayerMoves', () => {
    it('should update current player moves', () => {
      const moves = [moveWorkerTo(0, 0), moveWorkerTo(0, 1)]

      useGameStore.getState().setCurrentPlayerMoves(moves)

      const state = useGameStore.getState()
      expect(state.currentPlayerMoves).toEqual(moves)
    })

    it('should handle empty moves array', () => {
      useGameStore.getState().setCurrentPlayerMoves([])

      const state = useGameStore.getState()
      expect(state.currentPlayerMoves).toEqual([])
    })

    it('should handle non-array input by converting to empty array', () => {
      useGameStore.getState().setCurrentPlayerMoves(null as any)

      const state = useGameStore.getState()
      expect(state.currentPlayerMoves).toEqual([])
    })
  })

  describe('setMyTurn', () => {
    it('should set isMyTurn to true', () => {
      useGameStore.getState().setMyTurn(true)

      const state = useGameStore.getState()
      expect(state.isMyTurn).toBe(true)
    })

    it('should set isMyTurn to false', () => {
      useGameStore.getState().setMyTurn(true)
      useGameStore.getState().setMyTurn(false)

      const state = useGameStore.getState()
      expect(state.isMyTurn).toBe(false)
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
      useGameStore.getState().setMyTurn(true)
      useGameStore.getState().setSelectedWorker({ workerId: 1, x: 0, y: 0 })
      useGameStore.getState().setCurrentPlayerMoves([moveWorkerTo(0, 0)])

      // Reset
      useGameStore.getState().resetGame()

      const state = useGameStore.getState()
      expect(state.gameState).toBeNull()
      expect(state.gameId).toBeNull()
      expect(state.boardState).toBeNull()
      expect(state.currentPlayerMoves).toEqual([])
      expect(state.isMyTurn).toBe(false)
      expect(state.selectedWorker).toBeNull()
      expect(state.workersByPosition.size).toBe(0)
      expect(state.workersBySeat.size).toBe(0)
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
      expect(state.boardState?.cells[2][2].buildingLevel).toBe(2)
    })

    it('should update cell worker', () => {
      const worker = { seat: 0, workerId: 1 }
      useGameStore.getState().updateBoardCell(1, 1, { worker })

      const state = useGameStore.getState()
      expect(state.boardState?.cells[1][1].worker).toEqual(worker)
    })

    it('should not update out of bounds cells', () => {
      const stateBefore = useGameStore.getState().boardState

      useGameStore.getState().updateBoardCell(10, 10, { buildingLevel: 5 })

      const stateAfter = useGameStore.getState().boardState
      expect(stateAfter).toEqual(stateBefore)
    })

    it('should not update negative coordinate cells', () => {
      const stateBefore = useGameStore.getState().boardState

      useGameStore.getState().updateBoardCell(-1, 0, { buildingLevel: 5 })

      const stateAfter = useGameStore.getState().boardState
      expect(stateAfter).toEqual(stateBefore)
    })

    it('should rebuild worker indices after update', () => {
      const worker = { seat: 0, workerId: 1 }
      useGameStore.getState().updateBoardCell(3, 3, { worker })

      const state = useGameStore.getState()
      expect(state.workersByPosition.has('3,3')).toBe(true)
    })
  })

  describe('moveWorker', () => {
    beforeEach(() => {
      useGameStore.getState().setGameState(gameStateWith(boardWithWorkerAt(1, 1)))
    })

    it('should move worker from one cell to another', () => {
      useGameStore.getState().moveWorker(1, 1, 2, 2, 0, 1)

      const state = useGameStore.getState()
      expect(state.boardState?.cells[1][1].worker).toBeNull()
      expect(state.boardState?.cells[2][2].worker).toEqual({
        seat: 0,
        workerId: 1,
      })
    })

    it('should update worker indices after move', () => {
      useGameStore.getState().moveWorker(1, 1, 2, 2, 0, 1)

      const state = useGameStore.getState()
      expect(state.workersByPosition.has('1,1')).toBe(false)
      expect(state.workersByPosition.has('2,2')).toBe(true)
    })
  })
})
