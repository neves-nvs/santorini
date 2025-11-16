import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  performanceMonitor,
  measureOperation,
  measureAsyncOperation,
} from '../../utils/performanceMonitor'

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.reset()
    performanceMonitor.setEnabled(true)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('startTiming and endTiming', () => {
    it('should measure operation duration', () => {
      performanceMonitor.startTiming('test-operation')
      const duration = performanceMonitor.endTiming('test-operation')

      expect(duration).toBeGreaterThanOrEqual(0)
      expect(typeof duration).toBe('number')
    })

    it('should return null when timing not started', () => {
      const duration = performanceMonitor.endTiming('non-existent')

      expect(duration).toBeNull()
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('was not started')
      )
    })

    it('should log slow operations (>16ms)', () => {
      performanceMonitor.startTiming('slow-operation')
      
      // Mock performance.now to simulate slow operation
      const originalNow = performance.now
      let callCount = 0
      vi.spyOn(performance, 'now').mockImplementation(() => {
        callCount++
        return callCount === 1 ? 0 : 20 // 20ms duration
      })

      performanceMonitor.endTiming('slow-operation')

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected'),
        undefined
      )

      performance.now = originalNow
    })

    it('should log medium operations (5-16ms)', () => {
      performanceMonitor.startTiming('medium-operation')
      
      const originalNow = performance.now
      let callCount = 0
      vi.spyOn(performance, 'now').mockImplementation(() => {
        callCount++
        return callCount === 1 ? 0 : 10 // 10ms duration
      })

      performanceMonitor.endTiming('medium-operation')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('took'),
        undefined
      )

      performance.now = originalNow
    })

    it('should include metadata in timing', () => {
      const metadata = { component: 'Board3D', props: { size: 5 } }
      performanceMonitor.startTiming('render', metadata)
      
      const originalNow = performance.now
      let callCount = 0
      vi.spyOn(performance, 'now').mockImplementation(() => {
        callCount++
        return callCount === 1 ? 0 : 20
      })

      performanceMonitor.endTiming('render')

      expect(console.warn).toHaveBeenCalledWith(
        expect.any(String),
        metadata
      )

      performance.now = originalNow
    })
  })

  describe('trackRender', () => {
    it('should track component render count', () => {
      performanceMonitor.trackRender('TestComponent')
      performanceMonitor.trackRender('TestComponent')
      performanceMonitor.trackRender('TestComponent')

      const stats = performanceMonitor.getRenderStats()
      expect(stats.TestComponent).toBe(3)
    })

    it('should warn on excessive re-renders', () => {
      // Render 15 times (should warn at 10 and 15)
      for (let i = 0; i < 15; i++) {
        performanceMonitor.trackRender('ExcessiveComponent')
      }

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('has rendered 10 times'),
        undefined
      )
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('has rendered 15 times'),
        undefined
      )
    })

    it('should track multiple components separately', () => {
      performanceMonitor.trackRender('ComponentA')
      performanceMonitor.trackRender('ComponentB')
      performanceMonitor.trackRender('ComponentA')

      const stats = performanceMonitor.getRenderStats()
      expect(stats.ComponentA).toBe(2)
      expect(stats.ComponentB).toBe(1)
    })
  })

  describe('getRenderStats', () => {
    it('should return empty object initially', () => {
      const stats = performanceMonitor.getRenderStats()
      expect(stats).toEqual({})
    })

    it('should return all tracked components', () => {
      performanceMonitor.trackRender('ComponentA')
      performanceMonitor.trackRender('ComponentB')
      performanceMonitor.trackRender('ComponentA')

      const stats = performanceMonitor.getRenderStats()
      expect(Object.keys(stats)).toHaveLength(2)
      expect(stats).toEqual({
        ComponentA: 2,
        ComponentB: 1,
      })
    })
  })

  describe('reset', () => {
    it('should clear all metrics and render counts', () => {
      performanceMonitor.startTiming('test')
      performanceMonitor.trackRender('Component')

      performanceMonitor.reset()

      const stats = performanceMonitor.getRenderStats()
      expect(stats).toEqual({})
      
      const duration = performanceMonitor.endTiming('test')
      expect(duration).toBeNull()
    })
  })

  describe('setEnabled', () => {
    it('should disable monitoring', () => {
      performanceMonitor.setEnabled(false)
      
      performanceMonitor.startTiming('test')
      const duration = performanceMonitor.endTiming('test')

      expect(duration).toBeNull()
    })

    it('should re-enable monitoring', () => {
      performanceMonitor.setEnabled(false)
      performanceMonitor.setEnabled(true)
      
      performanceMonitor.startTiming('test')
      const duration = performanceMonitor.endTiming('test')

      expect(duration).not.toBeNull()
    })
  })
})

describe('measureOperation', () => {
  beforeEach(() => {
    performanceMonitor.reset()
    performanceMonitor.setEnabled(true)
  })

  it('should measure synchronous operation', () => {
    const operation = vi.fn(() => 'result')
    
    const result = measureOperation('sync-op', operation)

    expect(result).toBe('result')
    expect(operation).toHaveBeenCalled()
  })

  it('should measure operation with metadata', () => {
    const operation = vi.fn(() => 42)
    const metadata = { type: 'calculation' }
    
    const result = measureOperation('calc', operation, metadata)

    expect(result).toBe(42)
  })

  it('should rethrow errors and still end timing', () => {
    const operation = vi.fn(() => {
      throw new Error('Operation failed')
    })

    expect(() => measureOperation('failing-op', operation)).toThrow(
      'Operation failed'
    )
  })
})

describe('measureAsyncOperation', () => {
  beforeEach(() => {
    performanceMonitor.reset()
    performanceMonitor.setEnabled(true)
  })

  it('should measure async operation', async () => {
    const operation = vi.fn().mockResolvedValue('async-result')
    
    const result = await measureAsyncOperation('async-op', operation)

    expect(result).toBe('async-result')
    expect(operation).toHaveBeenCalled()
  })

  it('should measure async operation with metadata', async () => {
    const operation = vi.fn().mockResolvedValue(100)
    const metadata = { endpoint: '/api/games' }
    
    const result = await measureAsyncOperation('api-call', operation, metadata)

    expect(result).toBe(100)
  })

  it('should rethrow async errors and still end timing', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Async failed'))

    await expect(
      measureAsyncOperation('failing-async', operation)
    ).rejects.toThrow('Async failed')
  })

  it('should handle delayed async operations', async () => {
    const operation = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return 'delayed'
    })
    
    const result = await measureAsyncOperation('delayed-op', operation)

    expect(result).toBe('delayed')
  })
})

