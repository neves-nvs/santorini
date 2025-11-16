/**
 * React Three Fiber Testing Utilities
 *
 * Provides helpers for testing R3F components using the official
 * @react-three/test-renderer library
 *
 * @see https://r3f.docs.pmnd.rs/api/testing
 */

import React, { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import * as THREE from 'three'
import { vi } from 'vitest'

// Create a simple box geometry as a mock (shared across all mocks)
const mockGeometry = new THREE.BoxGeometry(1, 1, 1)

/**
 * Mock STL Loader to avoid loading actual STL files in tests
 */
export const mockSTLLoader = () => {
  // Mock the STLLoader
  vi.mock('three/examples/jsm/loaders/STLLoader', () => ({
    STLLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn((url, onLoad) => {
        onLoad(mockGeometry)
      }),
    })),
  }))

  // Mock useLoader hook from @react-three/fiber
  vi.mock('@react-three/fiber', async () => {
    const actual = await vi.importActual('@react-three/fiber')
    return {
      ...actual,
      useLoader: vi.fn(() => mockGeometry),
    }
  })
}

/**
 * Wrapper component that provides Canvas context for R3F components
 */
interface R3FWrapperProps {
  children: ReactNode
  cameraPosition?: [number, number, number]
  cameraFov?: number
}

export const R3FWrapper: React.FC<R3FWrapperProps> = ({ 
  children, 
  cameraPosition = [0, 5, 10],
  cameraFov = 50 
}) => {
  return (
    <Canvas
      camera={{ position: cameraPosition, fov: cameraFov }}
      gl={{ preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      {children}
    </Canvas>
  )
}

/**
 * Custom render function for R3F components
 * Wraps component in Canvas with proper setup
 */
export const renderR3F = (
  ui: ReactNode,
  options?: Omit<RenderOptions, 'wrapper'> & {
    cameraPosition?: [number, number, number]
    cameraFov?: number
  }
) => {
  const { cameraPosition, cameraFov, ...renderOptions } = options || {}
  
  return render(ui, {
    wrapper: ({ children }) => (
      <R3FWrapper cameraPosition={cameraPosition} cameraFov={cameraFov}>
        {children}
      </R3FWrapper>
    ),
    ...renderOptions,
  })
}

/**
 * Create mock game state for testing
 */
export const createMockGameState = (overrides = {}) => ({
  id: 1,
  status: 'in-progress',
  currentPlayer: 1,
  players: [
    { id: 1, username: 'player1', ready: true },
    { id: 2, username: 'player2', ready: true },
  ],
  board: {
    spaces: Array(5).fill(null).map(() => 
      Array(5).fill(null).map(() => ({
        buildingLevel: 0,
        worker: null,
      }))
    ),
  },
  ...overrides,
})

/**
 * Create mock board state for testing
 */
export const createMockBoardState = () => {
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
  boardState: any[][],
  x: number,
  y: number,
  playerId: number,
  workerId: number
) => {
  const newBoard = JSON.parse(JSON.stringify(boardState))
  newBoard[x][y].worker = { playerId, workerId }
  return newBoard
}

/**
 * Add a building to a board state at specific position
 */
export const addBuildingToBoardState = (
  boardState: any[][],
  x: number,
  y: number,
  level: number
) => {
  const newBoard = JSON.parse(JSON.stringify(boardState))
  newBoard[x][y].buildingLevel = level
  return newBoard
}

/**
 * Mock WebGL context for headless testing
 * Call this in test setup if you get WebGL errors
 */
export const mockWebGLContext = () => {
  const canvas = document.createElement('canvas')
  const gl = {
    getExtension: () => ({}),
    getParameter: () => ({}),
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    useProgram: () => {},
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    clear: () => {},
    clearColor: () => {},
    enable: () => {},
    disable: () => {},
    viewport: () => {},
    drawArrays: () => {},
    drawElements: () => {},
    createTexture: () => ({}),
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    generateMipmap: () => {},
    activeTexture: () => {},
    getUniformLocation: () => ({}),
    uniform1i: () => {},
    uniform1f: () => {},
    uniform2f: () => {},
    uniform3f: () => {},
    uniform4f: () => {},
    uniformMatrix4fv: () => {},
  }

  HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return gl
    }
    return null
  }) as any
}

/**
 * Wait for R3F to render frames
 * Useful when testing animations or frame-dependent behavior
 */
export const waitForR3FFrames = (frames = 1) => {
  return new Promise((resolve) => {
    let count = 0
    const check = () => {
      count++
      if (count >= frames) {
        resolve(true)
      } else {
        requestAnimationFrame(check)
      }
    }
    requestAnimationFrame(check)
  })
}

/**
 * Create a mock click event for 3D objects
 */
export const createMock3DClickEvent = (position: [number, number, number] = [0, 0, 0]) => ({
  stopPropagation: vi.fn(),
  point: new THREE.Vector3(...position),
  object: {},
  distance: 0,
  distanceToRay: 0,
  face: null,
  faceIndex: 0,
  uv: new THREE.Vector2(0, 0),
})

/**
 * Mock the entire STL loading system
 */
export const setupSTLMocks = () => {
  // Mock STL files
  global.fetch = vi.fn((url) => {
    if (typeof url === 'string' && url.includes('.stl')) {
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      })
    }
    return Promise.reject(new Error('Not found'))
  }) as any

  // Mock STLLoader
  mockSTLLoader()
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
export const createR3FRenderer = async (element: React.ReactElement) => {
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

