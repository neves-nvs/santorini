import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorType } from '@/shared/utils/errorHandler'
import { webSocketClient } from '@/game/services/WebSocketClient'

vi.mock('@/game/services/gameApi', () => ({ gameApi: { createWebSocketTicket: vi.fn(async () => 'ticket') } }))

class FakeSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static instances: FakeSocket[] = []

  readyState = FakeSocket.OPEN
  sent: Array<{ type: string; id?: string; payload: unknown }> = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number; reason: string }) => void) | null = null
  onerror: (() => void) | null = null

  constructor(readonly url: string) {
    FakeSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(JSON.parse(data))
  }

  close() {
    this.readyState = 3
  }

  receive(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
}

const events = { onMessage: vi.fn(), onConnectionChange: vi.fn(), onReset: vi.fn() }

async function connected(): Promise<FakeSocket> {
  await webSocketClient.connect()
  const socket = FakeSocket.instances[FakeSocket.instances.length - 1]
  socket.onopen?.()
  return socket
}

describe('WebSocketClient requests', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', FakeSocket)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    FakeSocket.instances = []
    webSocketClient.setEvents(events)
    Object.values(events).forEach((handler) => handler.mockClear())
  })

  afterEach(() => {
    webSocketClient.disconnect()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends the command with an id and resolves with the payload of the ok that carries it', async () => {
    const socket = await connected()

    const result = webSocketClient.joinGame('7')
    const { id } = socket.sent[0]
    socket.receive({ type: 'ok', id, payload: { gameId: 7 } })

    expect(socket.sent[0]).toEqual({ type: 'join_game', id, payload: { gameId: 7 } })
    await expect(result).resolves.toEqual({ gameId: 7 })
    expect(events.onMessage).not.toHaveBeenCalled()
  })

  it('answers each request with its own reply, whatever the order of the replies', async () => {
    const socket = await connected()

    const first = webSocketClient.joinGame('1')
    const second = webSocketClient.subscribeToGame('1')
    socket.receive({ type: 'ok', id: socket.sent[1].id, payload: { gameId: 12 } })
    socket.receive({ type: 'ok', id: socket.sent[0].id, payload: { gameId: 11 } })

    await expect(first).resolves.toEqual({ gameId: 11 })
    await expect(second).resolves.toEqual({ gameId: 12 })
  })

  it('rejects with the code and the message of the error that carries its id', async () => {
    const socket = await connected()

    const result = webSocketClient.setReady('7', true)
    socket.receive({
      type: 'error',
      id: socket.sent[0].id,
      payload: { code: 'game_not_found', message: 'Game not found' },
    })

    await expect(result).rejects.toMatchObject({
      type: ErrorType.WEBSOCKET,
      code: 'game_not_found',
      message: 'Game not found',
    })
  })

  it('hands an event, and an error nobody asked for, to the update layer', async () => {
    const socket = await connected()

    socket.receive({ type: 'game_state', payload: { gameId: 7 } })
    socket.receive({ type: 'error', payload: { code: 'invalid_message', message: 'Invalid message format' } })

    expect(events.onMessage).toHaveBeenCalledTimes(2)
    expect(events.onMessage).toHaveBeenCalledWith('game_state', { gameId: 7 })
  })

  it('rejects the requests still waiting when the socket closes', async () => {
    const socket = await connected()

    const result = webSocketClient.joinGame('7')
    socket.onclose?.({ code: 1006, reason: '' })

    await expect(result).rejects.toThrow('Connection closed')
  })

  it('rejects a request when there is no open socket', async () => {
    await expect(webSocketClient.request('join_game', { gameId: 7 })).rejects.toThrow('WebSocket not connected')
  })
})
