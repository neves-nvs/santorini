import { afterEach, describe, expect, it, vi } from 'vitest'
import { logError, logWarn } from '@/utils/log'

describe('log', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes warnings and errors to the matching console method', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    logWarn('careful')
    logError('broken')

    expect(warn).toHaveBeenCalledWith('careful')
    expect(error).toHaveBeenCalledWith('broken')
  })

  it('logs an Error as its message and not as an empty object', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    logError('Request failed:', new Error('boom'))

    expect(error).toHaveBeenCalledWith('Request failed:', 'boom')
  })

  it('strips line breaks so a value cannot forge a log line', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logWarn('first\nsecond\r')

    expect(warn).toHaveBeenCalledWith('firstsecond')
  })
})
