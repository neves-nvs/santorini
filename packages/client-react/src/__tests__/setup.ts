import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock WebSocket globally
global.WebSocket = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.OPEN,
})) as any

// Mock fetch globally
global.fetch = vi.fn()

// Mock window.performance if needed
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
  } as any
}

