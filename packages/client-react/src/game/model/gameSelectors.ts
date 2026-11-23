import { useGameStore } from './gameStore'
import { EMPTY_AVAILABLE_MOVES } from './game'
import type { BoardView } from './game'

const EMPTY_CELLS: BoardView['cells'] = []

function selectBoard(state: ReturnType<typeof useGameStore.getState>) {
  return state.gameState?.board ?? null
}

function toBuildingLevel(cell: { height: number; hasDome: boolean }) {
  return cell.hasDome ? cell.height + 1 : cell.height
}

// Board selectors read from the canonical server snapshot instead of a second cached board.
export const useBoardState = () => useGameStore(selectBoard)

export const useBoardCells = () => useGameStore(state => state.gameState?.board.cells ?? EMPTY_CELLS)

export const useBoardLastUpdated = () => useGameStore(state => state.gameState?.version ?? 0)

export const useBoardCell = (x: number, y: number) => useGameStore(state => {
  const cell = state.gameState?.board.cells[x]?.[y]
  return cell ? { buildingLevel: toBuildingLevel(cell), worker: cell.worker } : null
})

export const useCellBuildingLevel = (x: number, y: number) => useGameStore(state => {
  const cell = state.gameState?.board.cells[x]?.[y]
  return cell ? toBuildingLevel(cell) : 0
})

export const useCellWorker = (x: number, y: number) =>
  useGameStore(state => state.gameState?.board.cells[x]?.[y]?.worker ?? null)

export const useWorkerAt = (x: number, y: number) => useGameStore(state => {
  const worker = state.gameState?.board.cells[x]?.[y]?.worker
  return worker ? { x, y, ...worker } : null
})

export const useWorkersBySeat = (seat: number) => useGameStore(state =>
  state.getWorkersBySeat(seat)
)

export const useAllWorkers = () => useGameStore(state =>
  state.gameState?.board.cells.flatMap((row, x) => row.flatMap((cell, y) =>
    cell.worker ? [{ x, y, ...cell.worker }] : []
  )) ?? []
)

export const useCurrentPlayerMoves = () =>
  useGameStore(state => state.gameState?.availableMoves ?? EMPTY_AVAILABLE_MOVES)

export const useIsMyTurn = () =>
  useGameStore(state => state.gameState?.isCurrentPlayer ?? false)

export const useSelectedWorker = () => useGameStore(state => state.selectedWorker)
export const useGameId = () => useGameStore(state => state.gameId)
export const useGameState = () => useGameStore(state => state.gameState)
export const useCurrentPlayer = () => useGameStore(state => state.gameState?.currentPlayer)
export const useGamePhase = () => useGameStore(state => state.gameState?.phase)
export const useIsConnected = () => useGameStore(state => state.isConnected)
export const useIsConnecting = () => useGameStore(state => state.isConnecting)

export const useMovableWorkers = (currentSeat: number) => useGameStore(state =>
  state.getMovableWorkers(currentSeat)
)

export const useIsValidPosition = (x: number, y: number, selectedWorkerId?: number) => useGameStore(state => {
  const moves = state.gameState?.availableMoves ?? EMPTY_AVAILABLE_MOVES
  return moves.some(move =>
    (selectedWorkerId === undefined || move.workerId === selectedWorkerId) &&
    move.validPositions.some(position => position.x === x && position.y === y)
  )
})

export const useCanWorkerMove = (x: number, y: number, currentSeat: number) => useGameStore(state => {
  const worker = state.gameState?.board.cells[x]?.[y]?.worker
  return !!worker && worker.seat === currentSeat &&
    (state.gameState?.availableMoves ?? EMPTY_AVAILABLE_MOVES).some(move =>
      move.type === 'move_worker' && move.workerId === worker.workerId
    )
})

export const useSetGameState = () => useGameStore(state => state.setGameState)
export const useSetGameId = () => useGameStore(state => state.setGameId)
export const useSetSelectedWorker = () => useGameStore(state => state.setSelectedWorker)
export const useSetConnected = () => useGameStore(state => state.setConnected)
export const useSetConnecting = () => useGameStore(state => state.setConnecting)
export const useSetConnectionStatus = () => useGameStore(state => state.setConnectionStatus)
export const useResetGame = () => useGameStore(state => state.resetGame)
export const useUpdateBoardCell = () => useGameStore(state => state.updateBoardCell)
export const useMoveWorker = () => useGameStore(state => state.moveWorker)

export const useGameActions = () => useGameStore(state => ({
  setGameState: state.setGameState,
  setGameId: state.setGameId,
  setSelectedWorker: state.setSelectedWorker,
  setConnected: state.setConnected,
  setConnecting: state.setConnecting,
  resetGame: state.resetGame,
  updateBoardCell: state.updateBoardCell,
  moveWorker: state.moveWorker
}))

export const useGameStateShallow = () => useGameStore(state => ({
  id: state.gameState?.id,
  currentPlayer: state.gameState?.currentPlayer,
  phase: state.gameState?.phase,
  cellCount: state.gameState?.board.cells.length
}))

export const useStoreStats = () => useGameStore(state => ({
  hasGameState: !!state.gameState,
  workerCount: state.gameState?.board.cells.flat().filter(cell => cell.worker).length ?? 0,
  playerCount: state.gameState?.players.length ?? 0,
  moveCount: state.gameState?.availableMoves.length ?? 0,
  lastBoardUpdate: state.gameState?.version ?? 0
}))
