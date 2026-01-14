import { useState, useEffect, useCallback } from 'react'
import type { CameraType } from '../components/game/GameBoard'

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
  showAxis: false,
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
  const [cameraType, setCameraType] = useState<CameraType>('orthographic')

  // Keyboard shortcuts
  useEffect(() => {
    // Only enable in development
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+P: Toggle performance dashboard
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault()
        setDebugState(prev => ({ ...prev, showPerformance: !prev.showPerformance }))
      }
      // C: Toggle camera type
      if (event.key === 'c' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setCameraType(prev => prev === 'orthographic' ? 'perspective' : 'orthographic')
        }
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

  const toggleCameraType = useCallback(() => {
    setCameraType(prev => prev === 'orthographic' ? 'perspective' : 'orthographic')
  }, [])

  return {
    debugState,
    handleDebugChange,
    resetDebugState,
    cameraType,
    setCameraType,
    toggleCameraType,

    // Convenience flags
    isDebugMode: process.env.NODE_ENV === 'development',
    hasAnyDebugEnabled: Object.values(debugState).some(Boolean)
  }
}
