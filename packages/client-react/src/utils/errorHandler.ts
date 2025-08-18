// Centralized Error Handling System
// Provides consistent error handling patterns across the application

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
  details?: any
  timestamp: Date
}

export class GameError extends Error {
  public readonly type: ErrorType
  public readonly code?: string | number
  public readonly details?: any
  public readonly timestamp: Date

  constructor(type: ErrorType, message: string, code?: string | number, details?: any) {
    super(message)
    this.name = 'GameError'
    this.type = type
    this.code = code
    this.details = details
    this.timestamp = new Date()
  }
}

// Error message templates for consistency
export const ERROR_MESSAGES = {
  NETWORK: {
    CONNECTION_FAILED: 'Failed to connect to server. Please check your internet connection.',
    REQUEST_TIMEOUT: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error occurred. Please try again later.',
    OFFLINE: 'You appear to be offline. Please check your connection.'
  },
  VALIDATION: {
    INVALID_MOVE: 'Invalid move. Please select a valid position.',
    INVALID_INPUT: 'Invalid input provided.',
    MISSING_REQUIRED: 'Required information is missing.'
  },
  AUTHENTICATION: {
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    LOGIN_FAILED: 'Login failed. Please check your credentials.'
  },
  GAME_LOGIC: {
    NOT_YOUR_TURN: 'It is not your turn to move.',
    GAME_NOT_FOUND: 'Game not found or no longer available.',
    INVALID_GAME_STATE: 'Invalid game state detected.',
    MOVE_REJECTED: 'Move was rejected by the server.'
  },
  WEBSOCKET: {
    CONNECTION_LOST: 'Connection to game server lost. Attempting to reconnect...',
    RECONNECTION_FAILED: 'Failed to reconnect to game server.',
    MESSAGE_FAILED: 'Failed to send message to server.'
  }
} as const

// Error handling utilities
export class ErrorHandler {
  /**
   * Create a standardized error from various input types
   */
  static createError(
    type: ErrorType, 
    messageOrError: string | Error, 
    code?: string | number,
    details?: any
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
    let errorMessage = 'Unknown server error'
    let errorDetails: any = null

    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        errorDetails = await response.json()
        errorMessage = errorDetails.message || errorDetails.error || errorMessage
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
      : ERROR_MESSAGES.WEBSOCKET.CONNECTION_LOST

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
    return 'An unexpected error occurred. Please try again.'
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
