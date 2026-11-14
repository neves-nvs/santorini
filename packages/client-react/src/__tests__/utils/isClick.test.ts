import { describe, expect, it } from 'vitest'
import { isClick } from '../../utils/isClick'

describe('isClick', () => {
  it('accepts a press and release in the same spot', () => {
    expect(isClick({ delta: 0 })).toBe(true)
  })

  it('accepts a small jitter up to 5px', () => {
    expect(isClick({ delta: 5 })).toBe(true)
  })

  it('rejects a drag longer than 5px', () => {
    expect(isClick({ delta: 6 })).toBe(false)
  })
})
