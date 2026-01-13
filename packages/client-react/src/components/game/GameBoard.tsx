import React, { Suspense, useEffect, memo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PerspectiveCamera } from 'three'
import Board3D from './Board3D'

interface DebugState {
  showAxis: boolean
  showGrid: boolean
  showWireframe: boolean
  showStats: boolean
  showBoundingBoxes: boolean
  useSampleBoard: boolean
}

interface GameBoardProps {
  debugState?: DebugState
  onCellClick?: (x: number, y: number) => void
}

// Camera resize component - adjusts distance to keep board properly sized
const CameraResizer: React.FC = () => {
  const { camera, size } = useThree()

  useEffect(() => {
    const calculateOptimalPosition = () => {
      // Only handle PerspectiveCamera
      if (camera.type !== 'PerspectiveCamera') return

      const perspectiveCamera = camera as PerspectiveCamera
      const { width, height } = size
      const aspect = width / height

      // Update projection matrix
      perspectiveCamera.aspect = aspect
      perspectiveCamera.updateProjectionMatrix()

      // Calculate optimal distance to keep board properly sized
      const boardWidth = 5
      const boardHeight = 5
      const fov = perspectiveCamera.fov * (Math.PI / 180)

      const calculatedDistance = Math.max(
        boardHeight / (2 * Math.tan(fov / 2)),
        boardWidth / (2 * aspect * Math.tan(fov / 2))
      )

      // Set minimum distance to prevent camera from being too close
      const minDistance = 8
      const optimalDistance = Math.max(calculatedDistance, minDistance)

      // Adjust camera distance while preserving direction
      const currentPosition = perspectiveCamera.position.clone()
      const direction = currentPosition.clone().normalize()

      // Set new position at optimal distance in the same direction
      perspectiveCamera.position.copy(direction.multiplyScalar(optimalDistance))
    }

    // Set initial position immediately
    calculateOptimalPosition()

    // Listen for resize events
    const handleResize = calculateOptimalPosition
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [camera, size])

  return null
}

const GameBoard: React.FC<GameBoardProps> = memo(({ debugState, onCellClick }) => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 0
    }}>
      <Canvas
        camera={{
          position: [5.66, 5.66, 5.66], // Normalized direction * ~8 units distance
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#888888" />
          </mesh>
        }>
          {/* Camera resize handler */}
          <CameraResizer />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* Environment - Simple background without external HDR */}
          <color attach="background" args={['#87CEEB']} />
          <ambientLight intensity={0.4} />
          <hemisphereLight
            args={['#87CEEB', '#8B4513', 0.6]}
          />

          {/* 3D Board */}
          <Board3D
            debugState={debugState}
            onCellClick={onCellClick}
          />

          {/* Camera Controls - target set to board center */}
          <OrbitControls
            enablePan={true}
            enableZoom={false}
            enableRotate={true}
            enableDamping={true}
            target={[0, 0, 0]}
            maxPolarAngle={Math.PI / 2}
          />
        </Suspense>
      </Canvas>
    </div>
  )
})

export default GameBoard
