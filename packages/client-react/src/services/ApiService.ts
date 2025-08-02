export interface LoginRequest {
  username: string
  password: string
}

export interface CreateGameRequest {
  player_count: number
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
        const errorText = await response.text()

        // Handle authentication errors (401/403) - likely expired token
        if (response.status === 401 || response.status === 403) {
          console.warn('Authentication failed - token likely expired. Clearing auth state.')
          // Clear localStorage to force re-authentication
          localStorage.removeItem('username')
          localStorage.removeItem('gameId')
          // Redirect to auth page if not already there
          if (window.location.pathname !== '/auth') {
            window.location.href = '/auth'
          }
        }

        // Handle 404 for game-related endpoints - clear invalid game ID
        if (response.status === 404 && endpoint.includes('/games/')) {
          console.warn('Game not found (404) - clearing invalid game ID from localStorage')
          localStorage.removeItem('gameId')
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      } else {
        return await response.text() as unknown as T
      }
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error)
      throw error
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
      // Even if logout fails, clear local state
      console.warn('Logout request failed, but clearing local state anyway:', error)
    }
    // Always clear localStorage regardless of server response
    localStorage.removeItem('username')
    localStorage.removeItem('gameId')
  }

  // Get JWT token for WebSocket authentication
  async getToken(): Promise<{ token: string }> {
    return this.request<{ token: string }>('/token')
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

  async getGamesWithPlayerCounts(): Promise<any[]> {
    // This now returns games with player counts included
    return this.request<any[]>('/games')
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
      await this.request<any>(`/games/${gameId}/players`, {
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

  async getCurrentUser(): Promise<any> {
    return this.request<any>('/test-auth')
  }

  async getGameState(gameId: string): Promise<any> {
    const game = await this.request<any>(`/games/${gameId}`)
    const players = await this.request<any>(`/games/${gameId}/players`)
    return {
      ...game,
      players: players
    }
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
}

// Singleton instance
export const apiService = new ApiService()
