import React, { createContext, useContext, useReducer, ReactNode, useMemo, useCallback } from 'react'

interface AppContextState {
  username: string | null
  error: string | null
}

type AppAction =
  | { type: 'SET_USERNAME'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }

const initialState: AppContextState = {
  username: null,
  error: null,
}

const appReducer = (state: AppContextState, action: AppAction): AppContextState => {
  switch (action.type) {
    case 'SET_USERNAME':
      return { ...state, username: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'LOGOUT':
      return {
        ...initialState,
        username: null,
      }
    default:
      return state
  }
}

interface AppContextType {
  state: AppContextState
  dispatch: React.Dispatch<AppAction>
  setUsername: (username: string | null) => void
  setError: (error: string | null) => void
  logout: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const setUsername = useCallback((username: string | null) =>
    dispatch({ type: 'SET_USERNAME', payload: username }), [])

  const setError = useCallback((error: string | null) =>
    dispatch({ type: 'SET_ERROR', payload: error }), [])

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' })
  }, [])

  const contextValue = useMemo((): AppContextType => ({
    state,
    dispatch,
    setUsername,
    setError,
    logout,
  }), [
    state,
    setUsername,
    setError,
    logout
  ])

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
