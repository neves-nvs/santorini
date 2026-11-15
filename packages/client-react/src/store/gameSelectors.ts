import { useGameStore } from './gameStore'

// Optimized selectors for R3F components to prevent unnecessary re-renders

export const useCurrentPlayerMoves = () =>
  useGameStore(state => state.currentPlayerMoves)

export const useIsMyTurn = () =>
  useGameStore(state => state.isMyTurn)

export const useSelectedWorker = () =>
  useGameStore(state => state.selectedWorker)

export const useGameId = () =>
  useGameStore(state => state.gameId)

export const useGameState = () =>
  useGameStore(state => state.gameState)

export const useIsConnected = () =>
  useGameStore(state => state.isConnected)

export const useIsConnecting = () =>
  useGameStore(state => state.isConnecting)

// Individual action selectors (stable references to prevent infinite re-renders)
export const useSetGameState = () => useGameStore(state => state.setGameState)
export const useSetGameId = () => useGameStore(state => state.setGameId)
export const useSetSelectedWorker = () => useGameStore(state => state.setSelectedWorker)
