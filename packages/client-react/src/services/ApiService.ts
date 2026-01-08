import { ErrorHandler, ErrorType } from '../utils/errorHandler'
import type { GameInfo } from '../types/game'

export interface LoginRequest {
  username: string
  password: string
}

export interface CreateGameRequest {
  maxPlayers: number
}

export interface JoinGameRequest {
  username: string
  gameID: string
}

export interface CreateUserRequest {
  username: string
  password: string
}

export class ApiService {
  private baseUrl = 'http://localhost:3000'

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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
          console.warn('Authentication failed - redirecting to auth.')
          if (window.location.pathname !== '/auth') {
            window.location.href = '/auth'
          }
        }

        if (response.status === 404 && endpoint.includes('/games/')) {
          console.warn('Game not found')
          // Let the UI handle clearing game state, don't manipulate localStorage
        }

        ErrorHandler.logError(error, `ApiService.request(${endpoint})`)
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
      console.warn('Logout request failed:', error)
    }
    // Note: No longer clearing localStorage - let GameContext handle state
  }

  // Get JWT token for WebSocket authentication
  async getToken(): Promise<{ token: string }> {
    return this.request<{ token: string }>('/token')
  }

  // Check if user is authenticated and get user info
  async checkAuth(): Promise<{ id: number; username: string } | null> {
    try {
      // This endpoint should return user info if authenticated, 401 if not
      return await this.request<{ id: number; username: string }>('/me')
    } catch (error) {
      // If 401 or any auth error, user is not authenticated
      return null
    }
  }

  // User management
  async createUser(userData: CreateUserRequest): Promise<any> {
    return this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async getUsers(): Promise<any[]> {
    return this.request<any[]>('/users')
  }

  // Game management
  async getGames(): Promise<any[]> {
    return this.request<any[]>('/games')
  }

  async getGamesWithPlayerCounts(): Promise<GameInfo[]> {
    // This now returns games with player counts included
    return this.request<GameInfo[]>('/games')
  }

  async createGame(gameData: CreateGameRequest): Promise<any> {
    return this.request<any>('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    })
  }

  async getGame(gameId: string): Promise<any> {
    return this.request<any>(`/games/${gameId}`)
  }

  async joinGame(gameId: string): Promise<boolean> {
    try {
      await this.request<any>(`/games/${gameId}/join`, {
        method: 'POST',
      })
      return true
    } catch (error) {
      console.error('Failed to join game:', error)
      return false
    }
  }

  async getGamePlayers(gameId: string): Promise<any[]> {
    return this.request<any[]>(`/games/${gameId}/players`)
  }



  async getGameState(gameId: string): Promise<any> {
    // Use the new comprehensive game state endpoint
    console.log(`🔍 Fetching game state for game ID: ${gameId}`)
    const result = await this.request<any>(`/games/${gameId}`)
    console.log(`🔍 Game state response:`, result)
    console.log(`🔍 Board in response:`, result?.board)
    return result
  }

  async setPlayerReady(gameId: string, isReady: boolean): Promise<boolean> {
    try {
      console.log('🌐 ApiService.setPlayerReady called:', { gameId, isReady })
      console.log('🌐 Sending POST to:', `/games/${gameId}/ready`)
      console.log('🌐 Request body:', JSON.stringify({ isReady }))

      const response = await this.request<any>(`/games/${gameId}/ready`, {
        method: 'POST',
        body: JSON.stringify({ isReady }),
      })

      console.log('🌐 Backend response:', response)
      return true
    } catch (error) {
      console.error('🌐 Failed to set ready status:', error)
      return false
    }
  }

  // Game plays
  async makePlay(gameId: string, play: any): Promise<any> {
    return this.request<any>(`/games/${gameId}/plays`, {
      method: 'POST',
      body: JSON.stringify({ play }),
    })
  }

  // Make a move using the new turn management system
  async makeMove(gameId: string, move: any): Promise<any> {
    return this.request<any>(`/games/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ move }),
    })
  }

  // Get current turn state and available plays
  async getTurnState(gameId: string): Promise<any> {
    return this.request<any>(`/games/${gameId}/turn`)
  }
}

// Singleton instance
export const apiService = new ApiService()
