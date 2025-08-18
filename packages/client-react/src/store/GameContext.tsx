import React, { createContext, useContext, useReducer, ReactNode, useMemo, useCallback } from 'react'
import { GameState, Player, Move, AvailableMove } from '../types/game'

interface GameContextState {
  gameState: GameState | null
  username: string | null
  gameId: string | null
  currentPlayerMoves: AvailableMove[]  // Single source of truth for available moves
  isMyTurn: boolean
  isConnected: boolean
  isConnecting: boolean
  error: string | null
}

type GameAction =
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'SET_USERNAME'; payload: string }
  | { type: 'SET_GAME_ID'; payload: string }
  | { type: 'SET_CURRENT_PLAYER_MOVES'; payload: AvailableMove[] }
  | { type: 'SET_MY_TURN'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_GAME' }
  | { type: 'LOGOUT' }

const initialState: GameContextState = {
  gameState: null,
  username: null, // No longer cache username
  gameId: null,   // No longer cache gameId
  currentPlayerMoves: [],
  isMyTurn: false,
  isConnected: false,
  isConnecting: false,
  error: null,
}

const gameReducer = (state: GameContextState, action: GameAction): GameContextState => {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload }
    case 'SET_USERNAME':
      return { ...state, username: action.payload }
    case 'SET_GAME_ID':
      return { ...state, gameId: action.payload }
    case 'SET_CURRENT_PLAYER_MOVES':
      // Ensure payload is always an array
      const moves = Array.isArray(action.payload) ? action.payload : []
      return { ...state, currentPlayerMoves: moves }
    case 'SET_MY_TURN':
      return { ...state, isMyTurn: action.payload }
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload, isConnecting: false }
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'RESET_GAME':
      return { ...state, gameState: null, gameId: null, currentPlayerMoves: [], isMyTurn: false, error: null }
    case 'LOGOUT':
      return {
        ...initialState,
        username: null,
        gameId: null,
        isConnected: false,
        isConnecting: false, // Ensure connecting state is also reset
      }
    default:
      return state
  }
}

interface GameContextType {
  state: GameContextState
  dispatch: React.Dispatch<GameAction>
  // Simplified action creators - only the most commonly used ones
  setGameState: (gameState: GameState) => void
  setCurrentPlayerMoves: (moves: AvailableMove[]) => void
  setUsername: (username: string) => void  // Needed for auth
  setGameId: (gameId: string) => void  // Needed for navigation
  setError: (error: string | null) => void  // Needed for error handling
  setConnected: (connected: boolean) => void  // Needed for WebSocket
  setConnecting: (connecting: boolean) => void  // Needed for WebSocket
  setMyTurn: (isMyTurn: boolean) => void  // Needed for WebSocket
  resetGame: () => void
  logout: () => void  // Needed for auth
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  // Memoize action creators to prevent unnecessary re-renders
  const setGameState = useCallback((gameState: GameState) =>
    dispatch({ type: 'SET_GAME_STATE', payload: gameState }), [])

  const setCurrentPlayerMoves = useCallback((moves: AvailableMove[]) => {
    dispatch({ type: 'SET_CURRENT_PLAYER_MOVES', payload: moves })
  }, [])

  const setUsername = useCallback((username: string) =>
    dispatch({ type: 'SET_USERNAME', payload: username }), [])

  const setGameId = useCallback((gameId: string) =>
    dispatch({ type: 'SET_GAME_ID', payload: gameId }), [])

  const setError = useCallback((error: string | null) =>
    dispatch({ type: 'SET_ERROR', payload: error }), [])

  const setConnected = useCallback((connected: boolean) =>
    dispatch({ type: 'SET_CONNECTED', payload: connected }), [])

  const setConnecting = useCallback((connecting: boolean) =>
    dispatch({ type: 'SET_CONNECTING', payload: connecting }), [])

  const setMyTurn = useCallback((isMyTurn: boolean) =>
    dispatch({ type: 'SET_MY_TURN', payload: isMyTurn }), [])

  const resetGame = useCallback(() =>
    dispatch({ type: 'RESET_GAME' }), [])

  const logout = useCallback(() => {
    // Disconnect WebSocket before clearing state
    const { webSocketService } = require('../services/WebSocketService')
    webSocketService.disconnect()
    dispatch({ type: 'LOGOUT' })
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo((): GameContextType => ({
    state,
    dispatch,
    setGameState,
    setCurrentPlayerMoves,
    setUsername,
    setGameId,
    setError,
    setConnected,
    setConnecting,
    setMyTurn,
    resetGame,
    logout,
  }), [
    state,
    setGameState,
    setCurrentPlayerMoves,
    setUsername,
    setGameId,
    setError,
    setConnected,
    setConnecting,
    setMyTurn,
    resetGame,
    logout
  ])

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
