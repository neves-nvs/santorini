// Centralized Error Handling System
// Provides consistent error handling patterns across the application
import { i18n } from '@/shared/i18n'

export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION', 
  AUTHENTICATION = 'AUTHENTICATION',
  GAME_LOGIC = 'GAME_LOGIC',
  WEBSOCKET = 'WEBSOCKET',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType
  message: string
  code?: string | number
  details?: unknown
  timestamp: Date
}

export class GameError extends Error {
  public readonly type: ErrorType
  public readonly code?: string | number
  public readonly details?: unknown
  public readonly timestamp: Date

  constructor(type: ErrorType, message: string, code?: string | number, details?: unknown) {
    super(message)
    this.name = 'GameError'
    this.type = type
    this.code = code
    this.details = details
    this.timestamp = new Date()
  }
}

// Error handling utilities
interface HttpErrorBody {
  message?: string
  error?: string
  errors?: { msg: string }[]
}

export class ErrorHandler {
  /**
   * Create a standardized error from various input types
   */
  static createError(
    type: ErrorType, 
    messageOrError: string | Error, 
    code?: string | number,
    details?: unknown
  ): GameError {
    const message = messageOrError instanceof Error 
      ? messageOrError.message 
      : messageOrError

    return new GameError(type, message, code, details)
  }

  /**
   * Handle HTTP response errors consistently
   */
  static async handleHttpError(response: Response): Promise<GameError> {
    let errorMessage = i18n.t('errors.unknownServer')
    let errorDetails: HttpErrorBody | null = null

    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const body: HttpErrorBody = await response.json()
        errorDetails = body
        errorMessage = body.message || body.error || body.errors?.map((e) => e.msg).join(', ') || errorMessage
      } else {
        errorMessage = await response.text() || errorMessage
      }
    } catch {
      // If we can't parse the error response, use status text
      errorMessage = response.statusText || errorMessage
    }

    // Determine error type based on status code
    let errorType = ErrorType.UNKNOWN
    if (response.status === 401 || response.status === 403) {
      errorType = ErrorType.AUTHENTICATION
    } else if (response.status === 400 || response.status === 422) {
      errorType = ErrorType.VALIDATION
    } else if (response.status >= 500) {
      errorType = ErrorType.NETWORK
    }

    return new GameError(errorType, errorMessage, response.status, errorDetails)
  }

  /**
   * Handle WebSocket errors consistently
   */
  static handleWebSocketError(error: Event | Error): GameError {
    const message = error instanceof Error 
      ? error.message 
      : i18n.t('errors.connectionLost')

    return new GameError(ErrorType.WEBSOCKET, message, undefined, error)
  }

  /**
   * Log error with consistent format
   */
  static logError(error: GameError | Error, context?: string): void {
    const timestamp = new Date().toISOString()
    const contextStr = context ? `[${context}] ` : ''
    
    if (error instanceof GameError) {
      console.error(`${timestamp} ${contextStr}GameError [${error.type}]:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      })
    } else {
      console.error(`${timestamp} ${contextStr}Error:`, error)
    }
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: GameError | Error): string {
    if (error instanceof GameError) {
      return error.message
    }
    
    // Fallback for generic errors
    return i18n.t('errors.unexpected')
  }
}

// Async wrapper with consistent error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  errorType: ErrorType = ErrorType.UNKNOWN
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const gameError = error instanceof GameError 
      ? error 
      : ErrorHandler.createError(errorType, error as Error)
    
    ErrorHandler.logError(gameError, context)
    throw gameError
  }
}
