// Performance Monitoring Utilities
// Helps track and optimize component re-renders and expensive operations

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: any
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private renderCounts: Map<string, number> = new Map()
  private isEnabled: boolean = process.env.NODE_ENV === 'development'

  /**
   * Start timing an operation
   */
  startTiming(name: string, metadata?: any): void {
    if (!this.isEnabled) return

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    })
  }

  /**
   * End timing an operation and log the result
   */
  endTiming(name: string): number | null {
    if (!this.isEnabled) return null

    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`Performance metric '${name}' was not started`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - metric.startTime

    metric.endTime = endTime
    metric.duration = duration

    // Log slow operations
    if (duration > 16) { // More than one frame at 60fps
      console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metric.metadata)
    } else if (duration > 5) {
      console.log(`⚡ ${name} took ${duration.toFixed(2)}ms`, metric.metadata)
    }

    return duration
  }

  /**
   * Track component render count
   */
  trackRender(componentName: string, props?: any): void {
    if (!this.isEnabled) return

    const currentCount = this.renderCounts.get(componentName) || 0
    const newCount = currentCount + 1
    this.renderCounts.set(componentName, newCount)

    // Log excessive re-renders
    if (newCount > 10 && newCount % 5 === 0) {
      console.warn(`🔄 Component '${componentName}' has rendered ${newCount} times`, props)
    }
  }

  /**
   * Get render statistics
   */
  getRenderStats(): Record<string, number> {
    return Object.fromEntries(this.renderCounts)
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear()
    this.renderCounts.clear()
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor()

// Make it available globally for console access
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).performanceMonitor = performanceMonitor
}

// React hook for tracking component renders
export function useRenderTracker(componentName: string, dependencies?: any[]) {
  if (process.env.NODE_ENV === 'development') {
    React.useEffect(() => {
      performanceMonitor.trackRender(componentName, dependencies)
    })
  }
}

// Higher-order component for performance tracking
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const name = componentName || Component.displayName || Component.name || 'Unknown'
  
  return function TrackedComponent(props: P) {
    if (process.env.NODE_ENV === 'development') {
      performanceMonitor.trackRender(name, props)
    }
    
    return React.createElement(Component, props)
  }
}

// Utility for measuring expensive operations
export function measureOperation<T>(
  name: string,
  operation: () => T,
  metadata?: any
): T {
  performanceMonitor.startTiming(name, metadata)
  try {
    const result = operation()
    performanceMonitor.endTiming(name)
    return result
  } catch (error) {
    performanceMonitor.endTiming(name)
    throw error
  }
}

// Utility for measuring async operations
export async function measureAsyncOperation<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: any
): Promise<T> {
  performanceMonitor.startTiming(name, metadata)
  try {
    const result = await operation()
    performanceMonitor.endTiming(name)
    return result
  } catch (error) {
    performanceMonitor.endTiming(name)
    throw error
  }
}

// React import for the hooks
import React from 'react'
