import React, { ReactNode } from 'react'
import { create } from 'zustand'

interface AppState {
  userId: number | null
  username: string | null
  error: string | null
}

interface AppStore extends AppState {
  setUser: (user: { id: number; username: string } | null) => void
  setError: (error: string | null) => void
  logout: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  userId: null,
  username: null,
  error: null,

  setUser: (user) => set({
    userId: user?.id ?? null,
    username: user?.username ?? null
  }),

  setError: (error) => set({ error }),

  logout: () => set({
    userId: null,
    username: null,
    error: null
  })
}))

// Hook for React components (backwards compatible)
export const useApp = () => {
  const store = useAppStore()
  return {
    state: {
      userId: store.userId,
      username: store.username,
      error: store.error
    },
    setUser: store.setUser,
    setError: store.setError,
    logout: store.logout
  }
}

// Provider component for backwards compatibility (now just renders children)
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>
}
