import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// STL files are not loaded in tests: every useLoader call returns a box
vi.mock('@react-three/fiber', async () => {
  const THREE = await import('three')
  const actual = await vi.importActual<object>('@react-three/fiber')
  return { ...actual, useLoader: () => new THREE.BoxGeometry(1, 1, 1) }
})

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

