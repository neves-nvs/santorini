import React from 'react'
import * as THREE from 'three'
import STLPiece from './STLPiece'
import { PLAYER_COLORS } from '../../constants/gameConstants'

// Building Block Component
interface BlockProps {
  type: 'base' | 'mid' | 'top' | 'dome'
  position: [number, number, number]
  isPreview?: boolean
}

export const Block: React.FC<BlockProps> = ({ type, position, isPreview = false }) => {
  return (
    <STLPiece
      type={type}
      position={position}
      color={isPreview ? "#4A90E2" : "white"}
      transparent={isPreview}
      opacity={isPreview ? 0.6 : 1.0}
      castShadow={!isPreview}
      receiveShadow={!isPreview}
    />
  )
}

// Worker/Builder Component
interface WorkerProps {
  playerId: number
  position: [number, number, number]
  gameState?: any // Add gameState to get player order
  canMove?: boolean // Whether this worker can move
  isSelected?: boolean // Whether this worker is selected
  onClick?: () => void // Click handler for worker selection
}

export const Worker: React.FC<WorkerProps> = ({
  playerId,
  position,
  gameState,
  canMove = false,
  isSelected = false,
  onClick
}) => {
  // Use centralized player colors
  const colors = PLAYER_COLORS

  // Get player order from game state to ensure consistent coloring
  let colorIndex = 0
  if (gameState?.players && Array.isArray(gameState.players)) {
    // Players array contains objects, need to find by ID
    colorIndex = gameState.players.findIndex((player: any) =>
      (typeof player === 'object' ? player.id || player.userId : player) === playerId
    )
    if (colorIndex === -1) {
      // Fallback: use playerId directly
      colorIndex = (playerId - 1) % colors.length
    }
  } else {
    // Fallback: use playerId directly
    colorIndex = (playerId - 1) % colors.length
  }

  const selectedColor = colors[colorIndex] || colors[0]

  // Debug logging (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎨 Rendering worker for playerId ${playerId}, colorIndex ${colorIndex}, color ${selectedColor}`)
  }

  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        if (canMove && onClick) {
          onClick()
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (canMove) {
          document.body.style.cursor = 'pointer'
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'default'
      }}
    >
      {/* Main worker piece */}
      <STLPiece
        type="builder"
        position={position}
        color={selectedColor}
        transparent={false}
        castShadow={true}
      />

      {/* Highlight ring for moveable workers */}
      {canMove && (
        <mesh
          position={[position[0], position[1] - 0.1, position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.4, 0.6, 16]} />
          <meshBasicMaterial
            color={isSelected ? '#ffff00' : '#00ff00'}
            transparent
            opacity={isSelected ? 0.8 : 0.6}
          />
        </mesh>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[position[0], position[1] + 0.5, position[2]]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial
            color="#ffff00"
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
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
  workerId: number
  visible: boolean
  onClick?: () => void
}

// Building Preview Component - Shows what building will be constructed
interface BuildingPreviewProps {
  position: [number, number, number]
  buildingLevel?: number
  buildingType?: string
  moveType?: 'build_block' | 'build_dome'
  visible: boolean
  onClick?: () => void
}

export const MovePreview: React.FC<MovePreviewProps> = ({ position, workerId: _workerId, visible, onClick }) => {
  if (!visible) return null

  // Use a neutral color for move previews since they represent possible moves, not specific players
  const previewColor = '#FFD700' // Gold color for move previews

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'default'
      }}
    >
      {/* Glowing ring at ground level */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.45, 16]} />
        <meshBasicMaterial
          color={previewColor}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Pulsing center dot */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 16]} />
        <meshBasicMaterial
          color={previewColor}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Vertical indicator */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5]} />
        <meshBasicMaterial
          color={previewColor}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  )
}

// Building Preview Component - Shows what building will be constructed
export const BuildingPreview: React.FC<BuildingPreviewProps> = ({
  position,
  buildingLevel,
  buildingType,
  moveType,
  visible,
  onClick
}) => {
  console.log('🔧 BuildingPreview rendering:', { position, buildingLevel, buildingType, moveType, visible })

  if (!visible) return null

  const isDome = moveType === 'build_dome' || buildingType === 'dome'
  const level = buildingLevel || 1

  return (
    <group
      position={position}
      onClick={(e) => {
        console.log('🔧 BuildingPreview group clicked!')
        e.stopPropagation()
        onClick?.()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'default'
      }}
    >
      {/* Render actual building geometry as preview */}
      {isDome ? (
        // Dome preview - use actual dome geometry
        <Block
          type="dome"
          position={[0, 0, 0]}
          isPreview={true}
        />
      ) : (
        // Block preview - use actual block geometry
        <Block
          type={level === 1 ? 'base' : level === 2 ? 'mid' : 'top'}
          position={[0, 0, 0]}
          isPreview={true}
        />
      )}

      {/* Glowing base ring to indicate it's a preview */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.45, 16]} />
        <meshBasicMaterial
          color="#4A90E2"
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  )
}
