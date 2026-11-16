export interface DebugState {
  showAxis: boolean
  showGrid: boolean
  showWireframe: boolean
  showStats: boolean
  showBoundingBoxes: boolean
  useSampleBoard: boolean
  showPerformance: boolean
}

export const DEFAULT_DEBUG_STATE: DebugState = {
  showAxis: false,
  showGrid: false,
  showWireframe: false,
  showStats: false,
  showBoundingBoxes: false,
  useSampleBoard: false,
  showPerformance: false
}
