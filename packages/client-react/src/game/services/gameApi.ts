import { request } from '@/shared/services/request'
import type {
  CreateGameRequest,
  CreateGameResponse,
  GameSummary,
  GameView,
  WebSocketTicketResponse,
} from '@santorini/shared'

export class GameApi {
  // A one-time ticket for opening a WebSocket (browsers cannot set headers on the handshake)
  async createWebSocketTicket(signal?: AbortSignal): Promise<string> {
    const { ticket } = await request<WebSocketTicketResponse>('/ws-ticket', { method: 'POST', signal })
    return ticket
  }

  async getGames(): Promise<GameSummary[]> {
    return request<GameSummary[]>('/games')
  }

  async getMyGames(): Promise<GameSummary[]> {
    // Get games where the current user is a player
    return request<GameSummary[]>('/games/my')
  }

  async createGame(gameData: CreateGameRequest): Promise<CreateGameResponse> {
    return request<CreateGameResponse>('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    })
  }

  async getGame(gameId: string): Promise<GameView> {
    return request<GameView>(`/games/${gameId}`)
  }
}

export const gameApi = new GameApi()
