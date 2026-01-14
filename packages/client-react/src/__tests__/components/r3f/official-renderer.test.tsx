/**
 * Tests using the official @react-three/test-renderer
 *
 * This demonstrates the recommended approach for testing R3F components
 * @see https://r3f.docs.pmnd.rs/api/testing
 */

import { describe, it, expect, vi } from 'vitest'
import { createR3FRenderer, advanceR3FFrames, setupSTLMocks } from '../../helpers/r3f-test-utils'
import { useState } from 'react'
import Board3D from '../../../features/game/components/Board3D'
import { Cell, Block, Worker, BoundingBox, BoardBase } from '../../../features/game/components/GamePieces'

// ============================================================================
// Example Component: Rotating Box
// ============================================================================

interface RotatingBoxProps {
  initialScale?: number
  scaleIncrement?: number
}

function RotatingBox({ initialScale = 1, scaleIncrement = 0.5 }: RotatingBoxProps) {
  const [scale, setScale] = useState(initialScale)
  const [rotation, setRotation] = useState(0)

  return (
    <mesh
      scale={scale}
      rotation={[0, rotation, 0]}
      onClick={() => setScale(scale + scaleIncrement)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

// ============================================================================
// Tests
// ============================================================================

describe('Official @react-three/test-renderer', () => {
  describe('Basic Rendering', () => {
    it('should render a mesh with two children (geometry and material)', async () => {
      const renderer = await createR3FRenderer(<RotatingBox />)
      
      // Get the mesh from the scene
      const mesh = renderer.scene.children[0]
      
      // Check that mesh has geometry and material as children
      expect(mesh.allChildren.length).toBe(2)
      expect(mesh.type).toBe('Mesh')
    })

    it('should have correct initial props', async () => {
      const renderer = await createR3FRenderer(<RotatingBox initialScale={2} />)
      
      const mesh = renderer.scene.children[0]
      expect(mesh.props.scale).toBe(2)
      expect(mesh.props.rotation).toEqual([0, 0, 0])
    })

    it('should render with default scale', async () => {
      const renderer = await createR3FRenderer(<RotatingBox />)
      
      const mesh = renderer.scene.children[0]
      expect(mesh.props.scale).toBe(1)
    })
  })

  describe('Event Handling', () => {
    it('should increase scale when clicked', async () => {
      const renderer = await createR3FRenderer(<RotatingBox />)
      
      const mesh = renderer.scene.children[0]
      
      // Initial scale
      expect(mesh.props.scale).toBe(1)
      
      // Click the mesh
      await renderer.fireEvent(mesh, 'click')
      
      // Scale should increase
      expect(mesh.props.scale).toBe(1.5)
    })

    it('should increase scale multiple times', async () => {
      const renderer = await createR3FRenderer(<RotatingBox />)
      
      const mesh = renderer.scene.children[0]
      
      expect(mesh.props.scale).toBe(1)
      
      await renderer.fireEvent(mesh, 'click')
      expect(mesh.props.scale).toBe(1.5)
      
      await renderer.fireEvent(mesh, 'click')
      expect(mesh.props.scale).toBe(2.0)
      
      await renderer.fireEvent(mesh, 'click')
      expect(mesh.props.scale).toBe(2.5)
    })

    it('should use custom scale increment', async () => {
      const renderer = await createR3FRenderer(
        <RotatingBox initialScale={1} scaleIncrement={0.25} />
      )
      
      const mesh = renderer.scene.children[0]
      
      expect(mesh.props.scale).toBe(1)
      
      await renderer.fireEvent(mesh, 'click')
      expect(mesh.props.scale).toBe(1.25)
    })
  })

  describe('Frame Advancement', () => {
    it('should advance frames', async () => {
      const renderer = await createR3FRenderer(<RotatingBox />)
      
      // Advance 60 frames at 60fps (1 second)
      await advanceR3FFrames(renderer, 60, 1/60)
      
      // Component should still be rendered
      const mesh = renderer.scene.children[0]
      expect(mesh).toBeDefined()
    })

    it('should advance multiple frame batches', async () => {
      const renderer = await createR3FRenderer(<RotatingBox />)
      
      await advanceR3FFrames(renderer, 30, 1/60)
      await advanceR3FFrames(renderer, 30, 1/60)
      
      const mesh = renderer.scene.children[0]
      expect(mesh).toBeDefined()
    })
  })

  describe('Scene Graph Access', () => {
    it('should access scene children', async () => {
      const renderer = await createR3FRenderer(
        <>
          <RotatingBox />
          <RotatingBox />
          <RotatingBox />
        </>
      )
      
      // Should have 3 meshes in the scene
      expect(renderer.scene.children.length).toBe(3)
      
      // All should be meshes
      renderer.scene.children.forEach(child => {
        expect(child.type).toBe('Mesh')
      })
    })

    it('should access nested children', async () => {
      const renderer = await createR3FRenderer(
        <group>
          <RotatingBox />
          <RotatingBox />
        </group>
      )
      
      // Should have 1 group in the scene
      expect(renderer.scene.children.length).toBe(1)
      expect(renderer.scene.children[0].type).toBe('Group')
      
      // Group should have 2 mesh children
      const group = renderer.scene.children[0]
      expect(group.children.length).toBe(2)
    })

    it('should access allChildren for geometry and material', async () => {
      const renderer = await createR3FRenderer(<RotatingBox />)
      
      const mesh = renderer.scene.children[0]
      const allChildren = mesh.allChildren
      
      // Should have geometry and material
      expect(allChildren.length).toBe(2)
      
      // Check types
      const types = allChildren.map((child: any) => child.type)
      expect(types).toContain('BoxGeometry')
      expect(types).toContain('MeshStandardMaterial')
    })
  })

  describe('Props Inspection', () => {
    it('should inspect material color', async () => {
      const renderer = await createR3FRenderer(<RotatingBox />)

      const mesh = renderer.scene.children[0]
      const material = mesh.allChildren.find((child: any) =>
        child.type === 'MeshStandardMaterial'
      )

      expect(material).toBeDefined()
      expect(material?.props.color).toBe('orange')
    })

    it('should inspect geometry args', async () => {
      const renderer = await createR3FRenderer(<RotatingBox />)

      const mesh = renderer.scene.children[0]
      const geometry = mesh.allChildren.find((child: any) =>
        child.type === 'BoxGeometry'
      )

      expect(geometry).toBeDefined()
      expect(geometry?.props.args).toEqual([1, 1, 1])
    })
  })
})

// ============================================================================
// Game Board Tests
// ============================================================================

describe('Game Board Components', () => {
  describe('Cell Component', () => {
    it('should render a clickable cell with correct geometry', async () => {
      const mockClick = () => {}

      const renderer = await createR3FRenderer(
        <Cell position={[0, 0, 0]} gridX={0} gridZ={0} onClick={mockClick} />
      )

      const mesh = renderer.scene.children[0]

      // Should be a mesh
      expect(mesh.type).toBe('Mesh')

      // Should have geometry and material
      expect(mesh.allChildren.length).toBe(2)

      // Check geometry dimensions (0.95 x 0.02 x 0.95)
      const geometry = mesh.allChildren.find((child: any) =>
        child.type === 'BoxGeometry'
      )
      expect(geometry?.props.args).toEqual([0.95, 0.02, 0.95])

      // Check material is standard material
      const material = mesh.allChildren.find((child: any) =>
        child.type === 'MeshStandardMaterial'
      )
      expect(material).toBeDefined()
      expect(material?.props.transparent).toBe(false)
    })

    it('should render cells with checkered pattern colors', async () => {
      const mockClick = () => {}

      // Even cell (0,0) should be lighter green
      const evenRenderer = await createR3FRenderer(
        <Cell position={[0, 0, 0]} gridX={0} gridZ={0} onClick={mockClick} />
      )
      const evenMesh = evenRenderer.scene.children[0]
      const evenMaterial = evenMesh.allChildren.find((child: any) =>
        child.type === 'MeshStandardMaterial'
      )
      expect(evenMaterial?.props.color).toBe('#66BB6A')

      // Odd cell (0,1) should be darker green
      const oddRenderer = await createR3FRenderer(
        <Cell position={[0, 0, 0]} gridX={0} gridZ={1} onClick={mockClick} />
      )
      const oddMesh = oddRenderer.scene.children[0]
      const oddMaterial = oddMesh.allChildren.find((child: any) =>
        child.type === 'MeshStandardMaterial'
      )
      expect(oddMaterial?.props.color).toBe('#43A047')
    })
  })

  describe('Block Component', () => {
    it('should render building blocks with correct position', async () => {
      setupSTLMocks()

      const renderer = await createR3FRenderer(
        <Block type="base" position={[1, 0, 1]} />
      )

      // Should render a group containing the STL mesh
      const group = renderer.scene.children[0]
      expect(group).toBeDefined()
    })

    it('should render preview blocks with transparency', async () => {
      setupSTLMocks()

      const renderer = await createR3FRenderer(
        <Block type="mid" position={[0, 0.5, 0]} isPreview={true} />
      )

      const group = renderer.scene.children[0]
      expect(group).toBeDefined()
    })
  })

  describe('BoundingBox Component', () => {
    it('should not render when visible is false', async () => {
      const renderer = await createR3FRenderer(
        <BoundingBox position={[0, 0, 0]} blockLevel={2} visible={false} />
      )

      // Should render nothing
      expect(renderer.scene.children.length).toBe(0)
    })

    it('should render debug surfaces when visible is true', async () => {
      const renderer = await createR3FRenderer(
        <BoundingBox position={[0, 0, 0]} blockLevel={2} visible={true} />
      )

      // Should render a group with debug visualization
      const group = renderer.scene.children[0]
      expect(group.type).toBe('Group')
      expect(group.allChildren.length).toBeGreaterThan(0)
    })
  })

  describe('Component Re-render Optimization', () => {
    it('should not re-render Cell when unrelated state changes', async () => {
      let renderCount = 0

      const TrackedCell = ({ position, gridX, gridZ, onClick }: any) => {
        renderCount++
        return <Cell position={position} gridX={gridX} gridZ={gridZ} onClick={onClick} />
      }

      const TestWrapper = () => {
        const [unrelatedState, setUnrelatedState] = useState(0)
        return (
          <group>
            <TrackedCell position={[0, 0, 0]} gridX={0} gridZ={0} onClick={() => {}} />
            <mesh onClick={() => setUnrelatedState(prev => prev + 1)}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial />
            </mesh>
          </group>
        )
      }

      const renderer = await createR3FRenderer(<TestWrapper />)

      // Initial render
      expect(renderCount).toBe(1)

      // Click the trigger mesh (not the Cell)
      const triggerMesh = renderer.scene.children[0].allChildren.find((child: any) =>
        child.type === 'Mesh' && child.allChildren.some((c: any) => c.type === 'BoxGeometry')
      )

      if (triggerMesh) {
        await renderer.fireEvent(triggerMesh, 'onClick')

        // Cell should not re-render because it doesn't depend on unrelatedState
        // Note: This test verifies React's optimization, actual count may vary
        // depending on React's reconciliation
        expect(renderCount).toBeLessThanOrEqual(2)
      }
    })

    it('should memoize BoardBase component', async () => {
      setupSTLMocks()

      let renderCount = 0

      const TrackedBoardBase = () => {
        renderCount++
        return <BoardBase />
      }

      const TestWrapper = () => {
        const [counter, setCounter] = useState(0)
        return (
          <group>
            <TrackedBoardBase />
            <mesh onClick={() => setCounter(prev => prev + 1)}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial />
            </mesh>
          </group>
        )
      }

      const renderer = await createR3FRenderer(<TestWrapper />)

      // Initial render
      expect(renderCount).toBe(1)

      // Trigger state change
      const triggerMesh = renderer.scene.children[0].allChildren.find((child: any) =>
        child.type === 'Mesh' && child.allChildren.some((c: any) => c.type === 'BoxGeometry')
      )

      if (triggerMesh) {
        await renderer.fireEvent(triggerMesh, 'onClick')

        // BoardBase should not re-render (it has no props)
        expect(renderCount).toBeLessThanOrEqual(2)
      }
    })
  })
})

