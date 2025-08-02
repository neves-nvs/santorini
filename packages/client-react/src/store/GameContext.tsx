import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { GameState, Player, Move, AvailablePlay, AvailableMove } from '../types/game'

interface GameContextState {
  gameState: GameState | null
  username: string | null
  gameId: string | null
  availablePlays: AvailablePlay[]
  availableMoves: AvailableMove[]
  isMyTurn: boolean
  isConnected: boolean
  isConnecting: boolean
  error: string | null
}

type GameAction =
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'SET_USERNAME'; payload: string }
  | { type: 'SET_GAME_ID'; payload: string }
  | { type: 'SET_AVAILABLE_PLAYS'; payload: AvailablePlay[] }
  | { type: 'SET_AVAILABLE_MOVES'; payload: AvailableMove[] }
  | { type: 'SET_MY_TURN'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_GAME' }
  | { type: 'LOGOUT' }

const initialState: GameContextState = {
  gameState: null,
  username: localStorage.getItem('username'),
  gameId: localStorage.getItem('gameId'),
  availablePlays: [],
  availableMoves: [],
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
      localStorage.setItem('username', action.payload)
      return { ...state, username: action.payload }
    case 'SET_GAME_ID':
      localStorage.setItem('gameId', action.payload)
      return { ...state, gameId: action.payload }
    case 'SET_AVAILABLE_PLAYS':
      return { ...state, availablePlays: action.payload }
    case 'SET_AVAILABLE_MOVES':
      return { ...state, availableMoves: action.payload }
    case 'SET_MY_TURN':
      return { ...state, isMyTurn: action.payload }
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload, isConnecting: false }
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'RESET_GAME':
      localStorage.removeItem('gameId')
      return { ...state, gameState: null, gameId: null, availablePlays: [], availableMoves: [], isMyTurn: false, error: null }
    case 'LOGOUT':
      localStorage.removeItem('username')
      localStorage.removeItem('gameId')
      return {
        ...initialState,
        username: '',
        gameId: '',
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
  // Action creators
  setGameState: (gameState: GameState) => void
  setUsername: (username: string) => void
  setGameId: (gameId: string) => void
  setAvailablePlays: (plays: AvailablePlay[]) => void
  setAvailableMoves: (moves: AvailableMove[]) => void
  setMyTurn: (isMyTurn: boolean) => void
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setError: (error: string | null) => void
  resetGame: () => void
  logout: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  const contextValue: GameContextType = {
    state,
    dispatch,
    setGameState: (gameState: GameState) => dispatch({ type: 'SET_GAME_STATE', payload: gameState }),
    setUsername: (username: string) => dispatch({ type: 'SET_USERNAME', payload: username }),
    setGameId: (gameId: string) => dispatch({ type: 'SET_GAME_ID', payload: gameId }),
    setAvailablePlays: (plays: AvailablePlay[]) => dispatch({ type: 'SET_AVAILABLE_PLAYS', payload: plays }),
    setAvailableMoves: (moves: AvailableMove[]) => dispatch({ type: 'SET_AVAILABLE_MOVES', payload: moves }),
    setMyTurn: (isMyTurn: boolean) => dispatch({ type: 'SET_MY_TURN', payload: isMyTurn }),
    setConnected: (connected: boolean) => dispatch({ type: 'SET_CONNECTED', payload: connected }),
    setConnecting: (connecting: boolean) => dispatch({ type: 'SET_CONNECTING', payload: connecting }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    resetGame: () => dispatch({ type: 'RESET_GAME' }),
    logout: () => {
      // Disconnect WebSocket before clearing state
      const { webSocketService } = require('../services/WebSocketService')
      webSocketService.disconnect()

      dispatch({ type: 'LOGOUT' })
    },
  }

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
