import { beforeEach, describe, expect, it, vi } from 'vitest'
import { webSocketClient } from '@/services/WebSocketClient'

describe('webSocketClient.send', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('throws when the socket is not connected', () => {
    expect(() => webSocketClient.send({ type: 'list_games' })).toThrow('WebSocket not connected')
  })

  it('only takes messages the server understands', () => {
    const wrongShapes = () => {
      // @ts-expect-error a message type the server has no handler for
      webSocketClient.send({ type: 'test_message', payload: {} })
      // @ts-expect-error make_move needs a move
      webSocketClient.send({ type: 'make_move', payload: { gameId: 1 } })
      // @ts-expect-error join_game needs a number, not the string from the URL
      webSocketClient.send({ type: 'join_game', payload: { gameId: '1' } })
      // @ts-expect-error a build names no worker
      webSocketClient.makeMove(1, { type: 'build_block', position: { x: 0, y: 0 }, workerId: 2 })
    }

    expect(wrongShapes).toBeTypeOf('function')
  })
})
