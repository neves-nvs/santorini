import React from 'react'
import * as THREE from 'three'
import STLPiece from './STLPiece'

// Building Block Component
interface BlockProps {
  type: 'base' | 'mid' | 'top' | 'dome'
  position: [number, number, number]
}

export const Block: React.FC<BlockProps> = ({ type, position }) => {
  return (
    <STLPiece
      type={type}
      position={position}
      color="white"
      transparent={false}
      castShadow={true}
      receiveShadow={true}
    />
  )
}

// Worker/Builder Component
interface WorkerProps {
  playerId: number
  position: [number, number, number]
}

export const Worker: React.FC<WorkerProps> = ({ playerId, position }) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']

  return (
    <STLPiece
      type="builder"
      position={position}
      color={colors[playerId - 1] || colors[0]}
      transparent={false}
      castShadow={true}
    />
  )
}

// Board Base Component
export const BoardBase: React.FC = () => {
  return (
    <STLPiece
      type="board"
      position={[0, 0, 0]}
      color="white"
      transparent={false}
      receiveShadow={true}
    />
  )
}

// Clickable Cell Component with checkered pattern
interface CellProps {
  position: [number, number, number]
  gridX: number
  gridZ: number
  onClick: () => void
}

export const Cell: React.FC<CellProps> = ({ position, gridX, gridZ, onClick }) => {
  // Create checkered pattern: alternate colors based on grid coordinates
  const isEvenCell = (gridX + gridZ) % 2 === 0
  const cellColor = isEvenCell ? "#66BB6A" : "#43A047" // Fresh grass green / Medium grass green

  return (
    <mesh
      position={position}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'default'
      }}
    >
      <boxGeometry args={[0.95, 0.02, 0.95]} />
      <meshStandardMaterial
        color={cellColor}
        transparent={false}
      />
    </mesh>
  )
}

// Bounding Box Component for Blocks
interface BoundingBoxProps {
  position: [number, number, number]
  blockLevel: number
  visible: boolean
}

export const BoundingBox: React.FC<BoundingBoxProps> = ({ position, blockLevel, visible }) => {
  if (!visible) return null

  // Calculate height based on block level (each level is 0.5 units apart)
  const blockHeight = 0.5
  const totalHeight = blockLevel * blockHeight

  return (
    <group position={position}>
      {/* Bottom surface (at ground level) */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="yellow"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Top surface (at calculated block height) */}
      <mesh position={[0, totalHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="orange"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Vertical edges of bounding box */}
      {[
        [-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]
      ].map((corner, index) => (
        <mesh key={index} position={[corner[0], totalHeight / 2, corner[1]]}>
          <boxGeometry args={[0.02, totalHeight, 0.02]} />
          <meshBasicMaterial color="red" transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Horizontal outline at bottom */}
      <lineSegments position={[0, 0.01, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
        <lineBasicMaterial color="yellow" />
      </lineSegments>

      {/* Horizontal outline at top */}
      <lineSegments position={[0, totalHeight + 0.01, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
        <lineBasicMaterial color="orange" />
      </lineSegments>
    </group>
  )
}

// Move Preview Component - Shows valid placement positions
interface MovePreviewProps {
  position: [number, number, number]
  workerId: 1 | 2
  visible: boolean
}

export const MovePreview: React.FC<MovePreviewProps> = ({ position, workerId, visible }) => {
  if (!visible) return null

  // Different colors for different workers
  const workerColors = {
    1: '#FFD700', // Gold for worker 1
    2: '#FF6B6B'  // Red for worker 2
  }

  return (
    <group position={position}>
      {/* Glowing ring at ground level */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.45, 16]} />
        <meshBasicMaterial
          color={workerColors[workerId]}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Pulsing center dot */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 16]} />
        <meshBasicMaterial
          color={workerColors[workerId]}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Vertical indicator */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5]} />
        <meshBasicMaterial
          color={workerColors[workerId]}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  )
}
