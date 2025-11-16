import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ErrorType,
  GameError,
  ErrorHandler,
  ERROR_MESSAGES,
  withErrorHandling,
} from '../../utils/errorHandler'

describe('GameError', () => {
  it('should create a GameError with all properties', () => {
    const error = new GameError(
      ErrorType.NETWORK,
      'Connection failed',
      500,
      { url: '/api/games' }
    )

    expect(error.name).toBe('GameError')
    expect(error.type).toBe(ErrorType.NETWORK)
    expect(error.message).toBe('Connection failed')
    expect(error.code).toBe(500)
    expect(error.details).toEqual({ url: '/api/games' })
    expect(error.timestamp).toBeInstanceOf(Date)
  })

  it('should create a GameError without optional properties', () => {
    const error = new GameError(ErrorType.VALIDATION, 'Invalid input')

    expect(error.type).toBe(ErrorType.VALIDATION)
    expect(error.message).toBe('Invalid input')
    expect(error.code).toBeUndefined()
    expect(error.details).toBeUndefined()
  })
})

describe('ErrorHandler.createError', () => {
  it('should create error from string message', () => {
    const error = ErrorHandler.createError(
      ErrorType.AUTHENTICATION,
      'Token expired',
      401
    )

    expect(error).toBeInstanceOf(GameError)
    expect(error.type).toBe(ErrorType.AUTHENTICATION)
    expect(error.message).toBe('Token expired')
    expect(error.code).toBe(401)
  })

  it('should create error from Error object', () => {
    const originalError = new Error('Network timeout')
    const error = ErrorHandler.createError(
      ErrorType.NETWORK,
      originalError,
      408
    )

    expect(error.message).toBe('Network timeout')
    expect(error.type).toBe(ErrorType.NETWORK)
    expect(error.code).toBe(408)
  })

  it('should include details in created error', () => {
    const details = { endpoint: '/games', method: 'POST' }
    const error = ErrorHandler.createError(
      ErrorType.NETWORK,
      'Request failed',
      500,
      details
    )

    expect(error.details).toEqual(details)
  })
})

describe('ErrorHandler.handleHttpError', () => {
  it('should handle 401 authentication error', async () => {
    const response = new Response(
      JSON.stringify({ message: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }
    )

    const error = await ErrorHandler.handleHttpError(response)

    expect(error.type).toBe(ErrorType.AUTHENTICATION)
    expect(error.message).toBe('Unauthorized')
    expect(error.code).toBe(401)
  })

  it('should handle 403 authentication error', async () => {
    const response = new Response(
      JSON.stringify({ error: 'Forbidden' }),
      {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }
    )

    const error = await ErrorHandler.handleHttpError(response)

    expect(error.type).toBe(ErrorType.AUTHENTICATION)
    expect(error.message).toBe('Forbidden')
  })

  it('should handle 400 validation error', async () => {
    const response = new Response(
      JSON.stringify({ message: 'Invalid move' }),
      {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }
    )

    const error = await ErrorHandler.handleHttpError(response)

    expect(error.type).toBe(ErrorType.VALIDATION)
    expect(error.message).toBe('Invalid move')
  })

  it('should handle 422 validation error', async () => {
    const response = new Response(
      JSON.stringify({ message: 'Unprocessable entity' }),
      {
        status: 422,
        headers: { 'content-type': 'application/json' },
      }
    )

    const error = await ErrorHandler.handleHttpError(response)

    expect(error.type).toBe(ErrorType.VALIDATION)
  })

  it('should handle 500 server error', async () => {
    const response = new Response(
      JSON.stringify({ message: 'Internal server error' }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    )

    const error = await ErrorHandler.handleHttpError(response)

    expect(error.type).toBe(ErrorType.NETWORK)
    expect(error.message).toBe('Internal server error')
  })

  it('should handle non-JSON response', async () => {
    const response = new Response('Server error', {
      status: 500,
      statusText: 'Internal Server Error',
    })

    const error = await ErrorHandler.handleHttpError(response)

    expect(error.type).toBe(ErrorType.NETWORK)
    expect(error.message).toBe('Server error')
  })

  it('should use statusText as fallback', async () => {
    const response = new Response('', {
      status: 500,
      statusText: 'Internal Server Error',
    })

    const error = await ErrorHandler.handleHttpError(response)

    expect(error.message).toBe('Internal Server Error')
  })

  it('should handle unparseable response', async () => {
    const response = new Response('Invalid JSON{', {
      status: 500,
      headers: { 'content-type': 'application/json' },
      statusText: 'Server Error',
    })

    const error = await ErrorHandler.handleHttpError(response)

    expect(error.message).toBe('Server Error')
  })
})

describe('ErrorHandler.handleWebSocketError', () => {
  it('should handle Error object', () => {
    const originalError = new Error('Connection lost')
    const error = ErrorHandler.handleWebSocketError(originalError)

    expect(error.type).toBe(ErrorType.WEBSOCKET)
    expect(error.message).toBe('Connection lost')
  })

  it('should handle Event object', () => {
    const event = new Event('error')
    const error = ErrorHandler.handleWebSocketError(event)

    expect(error.type).toBe(ErrorType.WEBSOCKET)
    expect(error.message).toBe(ERROR_MESSAGES.WEBSOCKET.CONNECTION_LOST)
  })
})

describe('ErrorHandler.logError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should log GameError with details', () => {
    const error = new GameError(
      ErrorType.NETWORK,
      'Connection failed',
      500,
      { url: '/api' }
    )

    ErrorHandler.logError(error, 'TestContext')

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('TestContext'),
      expect.objectContaining({
        message: 'Connection failed',
        code: 500,
        details: { url: '/api' },
      })
    )
  })

  it('should log regular Error', () => {
    const error = new Error('Something went wrong')

    ErrorHandler.logError(error, 'TestContext')

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('TestContext'),
      error
    )
  })

  it('should log without context', () => {
    const error = new GameError(ErrorType.UNKNOWN, 'Unknown error')

    ErrorHandler.logError(error)

    expect(console.error).toHaveBeenCalled()
  })
})

describe('ErrorHandler.getUserMessage', () => {
  it('should return message from GameError', () => {
    const error = new GameError(ErrorType.NETWORK, 'Connection failed')
    const message = ErrorHandler.getUserMessage(error)

    expect(message).toBe('Connection failed')
  })

  it('should return generic message for regular Error', () => {
    const error = new Error('Internal error')
    const message = ErrorHandler.getUserMessage(error)

    expect(message).toBe('An unexpected error occurred. Please try again.')
  })
})

describe('withErrorHandling', () => {
  it('should return result on success', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    const result = await withErrorHandling(
      operation,
      'TestOperation',
      ErrorType.NETWORK
    )

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalled()
  })

  it('should wrap and rethrow GameError', async () => {
    const originalError = new GameError(ErrorType.VALIDATION, 'Invalid input')
    const operation = vi.fn().mockRejectedValue(originalError)

    await expect(
      withErrorHandling(operation, 'TestOperation', ErrorType.NETWORK)
    ).rejects.toThrow(originalError)
  })

  it('should create and throw GameError from regular Error', async () => {
    const originalError = new Error('Something failed')
    const operation = vi.fn().mockRejectedValue(originalError)

    await expect(
      withErrorHandling(operation, 'TestOperation', ErrorType.NETWORK)
    ).rejects.toThrow(GameError)
  })

  it('should log errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const operation = vi.fn().mockRejectedValue(new Error('Failed'))

    try {
      await withErrorHandling(operation, 'TestOperation', ErrorType.NETWORK)
    } catch {
      // Expected to throw
    }

    expect(console.error).toHaveBeenCalled()
  })
})

