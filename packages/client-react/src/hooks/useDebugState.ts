import { useState, useEffect, useCallback } from 'react'

export interface DebugState {
  showAxis: boolean
  showGrid: boolean
  showWireframe: boolean
  showStats: boolean
  showBoundingBoxes: boolean
  useSampleBoard: boolean
  showPerformance: boolean
}

const DEFAULT_DEBUG_STATE: DebugState = {
  showAxis: true,
  showGrid: false,
  showWireframe: false,
  showStats: false,
  showBoundingBoxes: false,
  useSampleBoard: false,
  showPerformance: false
}

/**
 * Hook to manage debug state and keyboard shortcuts
 * Only active in development builds
 */
export function useDebugState() {
  const [debugState, setDebugState] = useState<DebugState>(DEFAULT_DEBUG_STATE)

  // Keyboard shortcut for performance dashboard (Ctrl+Shift+P)
  useEffect(() => {
    // Only enable in development
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault()
        setDebugState(prev => ({ ...prev, showPerformance: !prev.showPerformance }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleDebugChange = useCallback((key: keyof DebugState, value: boolean) => {
    setDebugState(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetDebugState = useCallback(() => {
    setDebugState(DEFAULT_DEBUG_STATE)
  }, [])

  return {
    debugState,
    handleDebugChange,
    resetDebugState,
    
    // Convenience flags
    isDebugMode: process.env.NODE_ENV === 'development',
    hasAnyDebugEnabled: Object.values(debugState).some(Boolean)
  }
}
