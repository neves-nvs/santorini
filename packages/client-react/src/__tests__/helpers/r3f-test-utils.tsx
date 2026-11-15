import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { BoardCell } from '../../store/gameStore'

/**
 * Create mock board state for testing
 */
export const createMockBoardState = (): BoardCell[][] => {
  return Array(5).fill(null).map(() =>
    Array(5).fill(null).map(() => ({
      buildingLevel: 0,
      worker: null,
    }))
  )
}

/**
 * Add a worker to a board state at specific position
 */
export const addWorkerToBoardState = (
  boardState: BoardCell[][],
  x: number,
  y: number,
  playerId: number,
  workerId: number
): BoardCell[][] => {
  const newBoard = JSON.parse(JSON.stringify(boardState))
  newBoard[x][y].worker = { playerId, workerId }
  return newBoard
}

/**
 * Add a building to a board state at specific position
 */
export const addBuildingToBoardState = (
  boardState: BoardCell[][],
  x: number,
  y: number,
  level: number
): BoardCell[][] => {
  const newBoard = JSON.parse(JSON.stringify(boardState))
  newBoard[x][y].buildingLevel = level
  return newBoard
}

// ============================================================================
// Official @react-three/test-renderer Utilities
// ============================================================================

/**
 * Create a test renderer for R3F components using the official test renderer
 *
 * This is the recommended way to test R3F components as it provides:
 * - Access to the scene graph (renderer.scene.children)
 * - Event firing (renderer.fireEvent)
 * - Frame advancement (renderer.advanceFrames)
 * - No need for WebGL mocking
 *
 * @example
 * const renderer = await createR3FRenderer(<MyRotatingBox />)
 * const mesh = renderer.scene.children[0]
 * expect(mesh.type).toBe('Mesh')
 * expect(mesh.props.scale).toBe(1)
 *
 * // Fire click event
 * await renderer.fireEvent(mesh, 'click')
 * expect(mesh.props.scale).toBe(1.5)
 *
 * // Advance frames for animations
 * await renderer.advanceFrames(60, 1/60)
 *
 * @see https://r3f.docs.pmnd.rs/api/testing
 */
export const createR3FRenderer = async (element: Parameters<typeof ReactThreeTestRenderer.create>[0]) => {
  return await ReactThreeTestRenderer.create(element)
}

/**
 * Wait for R3F frames to complete using the test renderer
 * Useful for testing animations and async updates
 *
 * @param renderer - The test renderer instance
 * @param frames - Number of frames to advance (default: 1)
 * @param delta - Time delta per frame in seconds (default: 1/60)
 *
 * @example
 * const renderer = await createR3FRenderer(<AnimatedBox />)
 * await advanceR3FFrames(renderer, 60, 1/60) // Advance 60 frames at 60fps
 */
export const advanceR3FFrames = async (
  renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>,
  frames: number = 1,
  delta: number = 1/60
) => {
  await renderer.advanceFrames(frames, delta)
}

