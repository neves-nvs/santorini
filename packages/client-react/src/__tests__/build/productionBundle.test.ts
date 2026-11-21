// @vitest-environment node
import { build } from 'vite'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Rollup } from 'vite'

// Text that only the development tools contain: the debug menu and dashboard, and the performance monitor
const DEVELOPMENT_ONLY_TEXT = [
  'Debug Menu',
  'Performance Monitor',
  'Performance Tips',
  'Component Render Counts',
  'Slow operation detected',
  'has rendered',
  'was not started',
]

describe('the production bundle', () => {
  let code: string

  beforeAll(async () => {
    // Vitest sets NODE_ENV to "test", and Vite would then build a development bundle
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const result = (await build({ mode: 'production', logLevel: 'silent', build: { write: false } })) as Rollup.RollupOutput
      code = result.output.map((file) => (file.type === 'chunk' ? file.code : '')).join('\n')
    } finally {
      process.env.NODE_ENV = previous
    }
  })

  it('is built from the client sources', () => {
    expect(code.length).toBeGreaterThan(100_000)
  })

  it.each(DEVELOPMENT_ONLY_TEXT)('does not contain the development tool text "%s"', (text) => {
    expect(code).not.toContain(text)
  })
})
