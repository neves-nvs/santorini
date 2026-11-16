import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_DEBUG_STATE, type DebugState } from '@/game/model/debugState'
import type { CameraType } from '@/game/view/components/GameBoard'

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
    if (!import.meta.env.DEV) {
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
    isDebugMode: import.meta.env.DEV,
    hasAnyDebugEnabled: Object.values(debugState).some(Boolean)
  }
}
