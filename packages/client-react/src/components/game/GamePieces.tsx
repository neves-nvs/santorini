import React from 'react'
import STLPiece from './STLPiece'
import { PLAYER_COLORS } from '../../constants/gameConstants'

// Building colors
const DOME_COLOR = '#1E5F8A' // Marine blue

// Building Block Component
interface BlockProps {
  type: 'base' | 'mid' | 'top' | 'dome'
  position: [number, number, number]
  isPreview?: boolean
}

export const Block: React.FC<BlockProps> = React.memo(({ type, position, isPreview = false }) => {
  // Dome gets marine blue, other blocks are white
  const baseColor = type === 'dome' ? DOME_COLOR : 'white'

  return (
    <STLPiece
      type={type}
      position={position}
      color={isPreview ? "#4A90E2" : baseColor}
      transparent={isPreview}
      opacity={isPreview ? 0.6 : 1.0}
      castShadow={!isPreview}
      receiveShadow={!isPreview}
    />
  )
})

Block.displayName = 'Block'

// Worker/Builder Component
interface WorkerProps {
  playerId: number
  position: [number, number, number]
  canMove?: boolean // Whether this worker can move
  isSelected?: boolean // Whether this worker is selected
  onClick?: () => void // Click handler for worker selection
}

export const Worker: React.FC<WorkerProps> = ({
  playerId,
  position,
  canMove = false,
  isSelected = false,
  onClick
}) => {
  // Use centralized player colors
  const colors = PLAYER_COLORS

  // Simple color mapping based on playerId
  const colorIndex = (playerId - 1) % colors.length
  const selectedColor = colors[colorIndex] || colors[0]

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

// Single block bounding box
const SingleBlockBoundingBox: React.FC<{ yOffset: number; color: string }> = ({ yOffset, color }) => {
  const blockHeight = 0.5

  return (
    <group position={[0, yOffset, 0]}>
      {/* Vertical edges */}
      {[
        [-0.475, -0.475], [0.475, -0.475], [0.475, 0.475], [-0.475, 0.475]
      ].map((corner, index) => (
        <mesh key={index} position={[corner[0], blockHeight / 2, corner[1]]}>
          <boxGeometry args={[0.04, blockHeight, 0.04]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
      ))}

      {/* Bottom edges */}
      {[
        { pos: [0, 0.02, -0.475], size: [0.95, 0.04, 0.04] },
        { pos: [0, 0.02, 0.475], size: [0.95, 0.04, 0.04] },
        { pos: [-0.475, 0.02, 0], size: [0.04, 0.04, 0.95] },
        { pos: [0.475, 0.02, 0], size: [0.04, 0.04, 0.95] },
      ].map((edge, index) => (
        <mesh key={`bottom-${index}`} position={edge.pos as [number, number, number]}>
          <boxGeometry args={edge.size as [number, number, number]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
      ))}

      {/* Top edges */}
      {[
        { pos: [0, blockHeight, -0.475], size: [0.95, 0.04, 0.04] },
        { pos: [0, blockHeight, 0.475], size: [0.95, 0.04, 0.04] },
        { pos: [-0.475, blockHeight, 0], size: [0.04, 0.04, 0.95] },
        { pos: [0.475, blockHeight, 0], size: [0.04, 0.04, 0.95] },
      ].map((edge, index) => (
        <mesh key={`top-${index}`} position={edge.pos as [number, number, number]}>
          <boxGeometry args={edge.size as [number, number, number]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
      ))}
    </group>
  )
}

// Colors for each block level
const BLOCK_COLORS = ['#00ff00', '#ffff00', '#ff8800', '#ff0000'] // green, yellow, orange, red

export const BoundingBox: React.FC<BoundingBoxProps> = ({ position, blockLevel, visible }) => {
  if (!visible) return null

  const blockHeight = 0.5

  return (
    <group position={position}>
      {Array.from({ length: blockLevel }, (_, i) => (
        <SingleBlockBoundingBox
          key={i}
          yOffset={i * blockHeight}
          color={BLOCK_COLORS[i] || BLOCK_COLORS[BLOCK_COLORS.length - 1]}
        />
      ))}
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
  buildingLevel: number  // 1-4: next level to be built (derived from board state)
  moveType: 'build_block' | 'build_dome'
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
  moveType,
  visible,
  onClick
}) => {
  if (!visible) return null

  const isDome = moveType === 'build_dome'
  // Map buildingLevel (1-4) to block type: 1=base, 2=mid, 3=top, 4=dome
  const blockType = buildingLevel === 1 ? 'base' : buildingLevel === 2 ? 'mid' : 'top'

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
      {/* Render actual building geometry as preview */}
      <Block
        type={isDome ? 'dome' : blockType}
        position={[0, 0, 0]}
        isPreview={true}
      />

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
