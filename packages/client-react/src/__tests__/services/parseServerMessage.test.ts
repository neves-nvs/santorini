import { describe, expect, it } from 'vitest'
import { parseServerMessage } from '@/services/parseServerMessage'

describe('parseServerMessage', () => {
  it('returns a message the server can send', () => {
    const raw = JSON.stringify({ type: 'game_left', payload: { gameId: 7 } })

    expect(parseServerMessage(raw)).toEqual({ type: 'game_left', payload: { gameId: 7 } })
  })

  it.each([
    ['text that is not JSON', 'not json'],
    ['JSON that is not an object', '42'],
    ['null', 'null'],
    ['an object without a type', JSON.stringify({ payload: {} })],
    ['a type the client does not know', JSON.stringify({ type: 'game_exploded', payload: {} })],
    ['a message only the client sends', JSON.stringify({ type: 'make_move', payload: {} })],
  ])('returns nothing for %s', (_description, raw) => {
    expect(parseServerMessage(raw)).toBeNull()
  })
})
