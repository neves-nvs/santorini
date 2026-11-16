import { request } from '@/shared/services/request'
import { logWarn } from '@/shared/utils/log'
import type {
  CreateUserRequest,
  CurrentUserResponse,
  LoginRequest,
  TextResponse,
  UserView,
} from '@santorini/shared'

export class UserApi {
  async login(credentials: LoginRequest): Promise<TextResponse> {
    return request<TextResponse>('/session', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  async logout(): Promise<void> {
    try {
      await request<void>('/logout', {
        method: 'POST',
      })
    } catch (error) {
      logWarn('Logout request failed:', error)
    }
  }

  // Check if user is authenticated and get user info
  async checkAuth(): Promise<CurrentUserResponse | null> {
    try {
      // This endpoint should return user info if authenticated, 401 if not
      // Being logged out is an expected answer here, not an error to log
      return await request<CurrentUserResponse>('/me', {}, [401, 403])
    } catch {
      // If 401 or any auth error, user is not authenticated
      return null
    }
  }

  // User management
  async createUser(userData: CreateUserRequest): Promise<UserView> {
    return request<UserView>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async getUsers(): Promise<UserView[]> {
    return request<UserView[]>('/users')
  }
}

export const userApi = new UserApi()
