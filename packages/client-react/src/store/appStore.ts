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

