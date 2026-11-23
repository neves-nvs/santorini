import { useState, useCallback } from 'react'
import { DEFAULT_DEBUG_STATE, type DebugState } from '@/game/model/debugState'
import type { CameraType } from '@/game/view/components/GameBoard'

/**
 * Hook to manage debug state and keyboard shortcuts
 * Only active in development builds
 */
export function useDebugState() {
  const [debugState, setDebugState] = useState<DebugState>(DEFAULT_DEBUG_STATE)
  const [cameraType, setCameraType] = useState<CameraType>('orthographic')

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
