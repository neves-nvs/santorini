import { ErrorHandler, ErrorType } from '@/utils/errorHandler'
import { logWarn } from '@/utils/log'
import type { GameInfo, GameState } from '@/types/game'
import type { CreateGameRequest, CreateUserRequest, LoginRequest, UserSummary } from '@santorini/shared'

class ApiService {
  private baseUrl = import.meta.env.VITE_API_URL ?? '/api'

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    expectedStatuses: number[] = []
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
      mode: 'cors', // Explicitly set CORS mode
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        // Use centralized error handling
        const error = await ErrorHandler.handleHttpError(response)

        // Handle specific error types with consistent actions
        if (error.type === ErrorType.AUTHENTICATION) {
          logWarn('Authentication failed - redirecting to auth.')
          if (window.location.pathname !== '/auth') {
            window.location.href = '/auth'
          }
        }

        if (!expectedStatuses.includes(response.status)) {
          ErrorHandler.logError(error, `ApiService.request(${endpoint})`)
        }
        throw error
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      } else {
        return await response.text() as unknown as T
      }
    } catch (error) {
      // If it's already a GameError, just re-throw
      if (error instanceof Error && error.name === 'GameError') {
        throw error
      }

      // Handle network/fetch errors
      const networkError = ErrorHandler.createError(
        ErrorType.NETWORK,
        error as Error,
        undefined,
        { endpoint, url }
      )

      ErrorHandler.logError(networkError, `ApiService.request(${endpoint})`)
      throw networkError
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<string> {
    return this.request<string>('/session', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('/logout', {
        method: 'POST',
      })
    } catch (error) {
      logWarn('Logout request failed:', error)
    }
  }

  // A one-time ticket for opening a WebSocket (browsers cannot set headers on the handshake)
  async createWebSocketTicket(): Promise<string> {
    const { ticket } = await this.request<{ ticket: string }>('/ws-ticket', { method: 'POST' })
    return ticket
  }

  // Check if user is authenticated and get user info
  async checkAuth(): Promise<{ id: number; username: string } | null> {
    try {
      // This endpoint should return user info if authenticated, 401 if not
      // Being logged out is an expected answer here, not an error to log
      return await this.request<{ id: number; username: string }>('/me', {}, [401, 403])
    } catch {
      // If 401 or any auth error, user is not authenticated
      return null
    }
  }

  // User management
  async createUser(userData: CreateUserRequest): Promise<UserSummary> {
    return this.request<UserSummary>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async getUsers(): Promise<UserSummary[]> {
    return this.request<UserSummary[]>('/users')
  }

  // Game management
  async getGames(): Promise<GameInfo[]> {
    return this.request<GameInfo[]>('/games')
  }

  async getMyGames(): Promise<GameInfo[]> {
    // Get games where the current user is a player
    return this.request<GameInfo[]>('/games/my')
  }

  async createGame(gameData: CreateGameRequest): Promise<{ gameId: number }> {
    return this.request<{ gameId: number }>('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    })
  }

  async getGame(gameId: string): Promise<GameState> {
    return this.request<GameState>(`/games/${gameId}`)
  }
}

// Singleton instance
export const apiService = new ApiService()
