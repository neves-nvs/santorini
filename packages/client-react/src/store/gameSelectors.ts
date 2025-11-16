import { useGameStore } from './gameStore'
import { AvailableMove } from '../types/game'

// Optimized selectors for R3F components to prevent unnecessary re-renders

// Board-level selectors
export const useBoardState = () => 
  useGameStore(state => state.boardState)

export const useBoardCells = () => 
  useGameStore(state => state.boardState?.cells || [])

export const useBoardLastUpdated = () => 
  useGameStore(state => state.boardState?.lastUpdated || 0)

// Individual cell selectors (most granular)
export const useBoardCell = (x: number, y: number) => 
  useGameStore(state => {
    if (!state.boardState || x < 0 || x >= 5 || y < 0 || y >= 5) return null
    return state.boardState.cells[x][y]
  })

export const useCellBuildingLevel = (x: number, y: number) => 
  useGameStore(state => {
    if (!state.boardState || x < 0 || x >= 5 || y < 0 || y >= 5) return 0
    return state.boardState.cells[x][y].buildingLevel
  })

export const useCellWorker = (x: number, y: number) => 
  useGameStore(state => {
    if (!state.boardState || x < 0 || x >= 5 || y < 0 || y >= 5) return null
    return state.boardState.cells[x][y].worker
  })

// Worker-specific selectors
export const useWorkerAt = (x: number, y: number) => 
  useGameStore(state => state.workersByPosition.get(`${x},${y}`) || null)

export const useWorkersByPlayer = (playerId: number) => 
  useGameStore(state => state.workersByPlayer.get(playerId) || [])

export const useAllWorkers = () => 
  useGameStore(state => Array.from(state.workersByPosition.values()))

// Move and turn selectors
export const useCurrentPlayerMoves = () => 
  useGameStore(state => state.currentPlayerMoves)

export const useIsMyTurn = () => 
  useGameStore(state => state.isMyTurn)

export const useSelectedWorker = () => 
  useGameStore(state => state.selectedWorker)

// Game state selectors
export const useGameId = () => 
  useGameStore(state => state.gameId)

export const useGameState = () => 
  useGameStore(state => state.gameState)

export const useCurrentPlayer = () => 
  useGameStore(state => state.gameState?.currentPlayer)

export const useGamePhase = () => 
  useGameStore(state => state.gameState?.game_phase)

// Connection selectors
export const useIsConnected = () => 
  useGameStore(state => state.isConnected)

export const useIsConnecting = () => 
  useGameStore(state => state.isConnecting)

// Computed selectors for game logic
export const useMovableWorkers = (currentPlayerId: number) => 
  useGameStore(state => {
    const playerWorkers = state.workersByPlayer.get(currentPlayerId) || []
    const moveWorkerMoves = state.currentPlayerMoves.filter(move => move.type === 'move_worker')
    
    return playerWorkers.filter(worker =>
      moveWorkerMoves.some(move => move.workerId === worker.workerId)
    )
  })

export const useValidPositions = (selectedWorkerId?: number) => 
  useGameStore(state => {
    const moves = state.currentPlayerMoves
    const positions: Array<{
      x: number
      y: number
      workerId: 1 | 2
      type: string
      buildingLevel?: number
      buildingType?: string
      moveType?: string
      serverMoveObject?: any
    }> = []

    if (!Array.isArray(moves)) return positions

    for (const move of moves) {
      // For placement phase, show all positions
      if (move.type === 'place_worker') {
        for (const pos of move.validPositions) {
          positions.push({
            x: pos.x,
            y: pos.y,
            workerId: move.workerId,
            type: move.type
          })
        }
      }
      // For movement/building phase, only show positions for selected worker
      else if (!selectedWorkerId || move.workerId === selectedWorkerId) {
        for (const pos of move.validPositions) {
          const posWithBuilding = pos as any
          positions.push({
            x: pos.x,
            y: pos.y,
            workerId: move.workerId,
            type: move.type,
            buildingLevel: posWithBuilding.buildingLevel,
            buildingType: posWithBuilding.buildingType,
            moveType: posWithBuilding.moveType,
            serverMoveObject: posWithBuilding.serverMoveObject
          })
        }
      }
    }

    return positions
  })

// Specific position validation
export const useIsValidPosition = (x: number, y: number, selectedWorkerId?: number) => 
  useGameStore(state => {
    const moves = state.currentPlayerMoves
    if (!Array.isArray(moves)) return false

    for (const move of moves) {
      if (selectedWorkerId && move.workerId !== selectedWorkerId) continue
      
      const isValid = move.validPositions.some(pos => pos.x === x && pos.y === y)
      if (isValid) return true
    }
    
    return false
  })

// Worker interaction selectors
export const useCanWorkerMove = (x: number, y: number, currentPlayerId: number) => 
  useGameStore(state => {
    const worker = state.workersByPosition.get(`${x},${y}`)
    if (!worker || worker.playerId !== currentPlayerId) return false
    
    const moveWorkerMoves = state.currentPlayerMoves.filter(move => move.type === 'move_worker')
    return moveWorkerMoves.some(move => move.workerId === worker.workerId)
  })

// Individual action selectors (stable references to prevent infinite re-renders)
export const useSetGameState = () => useGameStore(state => state.setGameState)
export const useSetGameId = () => useGameStore(state => state.setGameId)
export const useSetCurrentPlayerMoves = () => useGameStore(state => state.setCurrentPlayerMoves)
export const useSetMyTurn = () => useGameStore(state => state.setMyTurn)
export const useSetSelectedWorker = () => useGameStore(state => state.setSelectedWorker)
export const useSetConnected = () => useGameStore(state => state.setConnected)
export const useSetConnecting = () => useGameStore(state => state.setConnecting)
export const useResetGame = () => useGameStore(state => state.resetGame)
export const useUpdateBoardCell = () => useGameStore(state => state.updateBoardCell)
export const useMoveWorker = () => useGameStore(state => state.moveWorker)

// Legacy actions selector (for backward compatibility, but prefer individual selectors)
export const useGameActions = () =>
  useGameStore(state => ({
    setGameState: state.setGameState,
    setGameId: state.setGameId,
    setCurrentPlayerMoves: state.setCurrentPlayerMoves,
    setMyTurn: state.setMyTurn,
    setSelectedWorker: state.setSelectedWorker,
    setConnected: state.setConnected,
    setConnecting: state.setConnecting,
    resetGame: state.resetGame,
    updateBoardCell: state.updateBoardCell,
    moveWorker: state.moveWorker
  }))

// Shallow comparison selectors for complex objects
export const useGameStateShallow = () => 
  useGameStore(state => state.gameState, (a, b) => {
    if (!a && !b) return true
    if (!a || !b) return false
    return a.id === b.id && 
           a.currentPlayer === b.currentPlayer && 
           a.game_phase === b.game_phase &&
           a.board?.spaces?.length === b.board?.spaces?.length
  })

// Performance monitoring selector
export const useStoreStats = () => 
  useGameStore(state => ({
    hasGameState: !!state.gameState,
    hasBoardState: !!state.boardState,
    workerCount: state.workersByPosition.size,
    playerCount: state.workersByPlayer.size,
    moveCount: state.currentPlayerMoves.length,
    lastBoardUpdate: state.boardState?.lastUpdated || 0
  }))
