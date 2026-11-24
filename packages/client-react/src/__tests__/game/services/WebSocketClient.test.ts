import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorType } from '@/shared/utils/errorHandler'
import { webSocketClient } from '@/game/services/WebSocketClient'
import { gameApi } from '@/game/services/gameApi'

vi.mock('@/game/services/gameApi', () => ({ gameApi: { createWebSocketTicket: vi.fn(async () => 'ticket') } }))

class FakeSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static instances: FakeSocket[] = []

  readyState = FakeSocket.CONNECTING
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

  open() {
    this.readyState = FakeSocket.OPEN
    this.onopen?.()
  }

  drop() {
    this.close()
    this.onclose?.({ code: 1006, reason: '' })
  }

  receive(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
}

const events = {
  onMessage: vi.fn(),
  onConnectionChange: vi.fn(),
  onConnectionStatusChange: vi.fn(),
  onReset: vi.fn()
}

async function connected(): Promise<FakeSocket> {
  await webSocketClient.connect()
  const socket = FakeSocket.instances[FakeSocket.instances.length - 1]
  socket.open()
  return socket
}

describe('WebSocketClient requests', () => {
  it('detects a silent drop while idle and replaces the unresponsive socket', async () => {
    vi.useFakeTimers()
    const socket = await connected()
    await vi.advanceTimersByTimeAsync(15_000)
    expect(socket.sent).toContainEqual({ type: 'ping', id: expect.any(String), payload: {} })
    await vi.advanceTimersByTimeAsync(11_000)
    expect(socket.readyState).toBe(3)
    expect(FakeSocket.instances).toHaveLength(2)
  })

  it('keeps a healthy idle connection and stops heartbeats when leaving the game', async () => {
    vi.useFakeTimers()
    const socket = await connected()
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(15_000)
      const ping = socket.sent[socket.sent.length - 1]
      expect(ping?.type).toBe('ping')
      socket.receive({ type: 'ok', id: ping?.id, payload: {} })
    }
    expect(FakeSocket.instances).toHaveLength(1)
    webSocketClient.disconnect()
    const count = socket.sent.length
    await vi.advanceTimersByTimeAsync(60_000)
    expect(socket.sent).toHaveLength(count)
  })
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
    vi.useRealTimers()
    vi.mocked(gameApi.createWebSocketTicket).mockReset().mockResolvedValue('ticket')
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
    socket.drop()

    await expect(result).rejects.toThrow('Connection closed')
  })

  it('rejects a request when there is no open socket', async () => {
    await expect(webSocketClient.request('join_game', { gameId: 7 })).rejects.toThrow('WebSocket not connected')
  })

  it('reopens the socket when the network returns after the initial retry window', async () => {
    vi.useFakeTimers()
    const socket = await connected()
    vi.mocked(gameApi.createWebSocketTicket).mockRejectedValue(new Error('Offline'))

    socket.drop()
    await vi.advanceTimersByTimeAsync(15_000)
    expect(events.onConnectionStatusChange).toHaveBeenLastCalledWith('failed', 5, 5)

    vi.mocked(gameApi.createWebSocketTicket).mockResolvedValue('fresh-ticket')
    await vi.advanceTimersByTimeAsync(15_000)
    expect(FakeSocket.instances).toHaveLength(2)
    FakeSocket.instances[1].open()
    expect(events.onConnectionChange).toHaveBeenLastCalledWith(true)
  })

  it('preserves reconnect backoff across subscriptions until explicitly reset', async () => {
    vi.useFakeTimers()
    const original = await connected()
    original.drop()
    await vi.advanceTimersByTimeAsync(1_000)
    const replacement = FakeSocket.instances[1]
    replacement.open()
    const subscription = webSocketClient.subscribeToGame('7')
    replacement.receive({ type: 'ok', id: replacement.sent[0].id, payload: { gameId: 7 } })
    await subscription

    replacement.drop()
    expect(events.onConnectionStatusChange).toHaveBeenLastCalledWith('reconnecting', 2, 5)
    await vi.advanceTimersByTimeAsync(2_000)
    const next = FakeSocket.instances[2]
    next.open()

    webSocketClient.resetReconnectBackoff()
    next.drop()
    expect(events.onConnectionStatusChange).toHaveBeenLastCalledWith('reconnecting', 1, 5)
  })

  it('replaces an open socket that never acknowledges a game subscription', async () => {
    vi.useFakeTimers()
    await connected()
    const rejected = vi.fn()
    void webSocketClient.subscribeToGame('7').catch(rejected)

    await vi.advanceTimersByTimeAsync(12_000)
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/timed out/i) }))
    expect(FakeSocket.instances).toHaveLength(2)
  })

  it('times out a stalled ticket request and tries for a fresh ticket', async () => {
    vi.useFakeTimers()
    vi.mocked(gameApi.createWebSocketTicket).mockImplementationOnce((signal) =>
      new Promise((_, reject) => signal?.addEventListener('abort', () => reject(signal.reason), { once: true })),
    )
    const connecting = webSocketClient.connect()

    await vi.advanceTimersByTimeAsync(11_000)
    await connecting
    expect(gameApi.createWebSocketTicket).toHaveBeenCalledTimes(2)
    expect(FakeSocket.instances).toHaveLength(1)
    FakeSocket.instances[0].open()
    expect(events.onConnectionChange).toHaveBeenLastCalledWith(true)
  })

  it('times out a stalled WebSocket handshake and retries', async () => {
    vi.useFakeTimers()
    await webSocketClient.connect()
    const stalled = FakeSocket.instances[0]

    await vi.advanceTimersByTimeAsync(11_000)
    expect(stalled.readyState).toBe(3)
    expect(FakeSocket.instances).toHaveLength(2)
  })

  it('ignores a close event from a previous socket while the replacement is subscribing', async () => {
    const previous = await connected()
    webSocketClient.disconnect()
    const replacement = await connected()
    const rejected = vi.fn()
    const subscription = webSocketClient.subscribeToGame('7').catch(rejected)

    previous.drop()
    replacement.receive({ type: 'ok', id: replacement.sent[0].id, payload: { gameId: 7 } })

    await expect(subscription).resolves.toEqual({ gameId: 7 })
    expect(rejected).not.toHaveBeenCalled()
    expect(events.onConnectionChange).toHaveBeenLastCalledWith(true)
  })
})
