import { ErrorHandler, ErrorType } from '@/shared/utils/errorHandler'
import { logWarn } from '@/shared/utils/log'

const baseUrl = import.meta.env.VITE_API_URL ?? '/api'

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  expectedStatuses: number[] = []
): Promise<T> {
  const url = `${baseUrl}${endpoint}`

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
      if (error.type === ErrorType.AUTHENTICATION && !expectedStatuses.includes(response.status)) {
        logWarn('Authentication failed - redirecting to auth.')
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth'
        }
      }

      if (!expectedStatuses.includes(response.status)) {
        ErrorHandler.logError(error, `request(${endpoint})`)
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

    ErrorHandler.logError(networkError, `request(${endpoint})`)
    throw networkError
  }
}
