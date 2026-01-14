import React, { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
// @ts-expect-error - STLLoader types not available
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { Vector3 } from 'three'
import { configs, PieceType } from './stl-config'

interface STLPieceProps {
  type: PieceType
  position: [number, number, number]
  color?: string
  transparent?: boolean
  opacity?: number
  castShadow?: boolean
  receiveShadow?: boolean
}

/**
 * Base STL Piece component that handles loading and positioning of STL models
 * Applies the exact transformation settings from the original client
 *
 * IMPORTANT: All transformations (scale, rotation, position offset) are computed
 * synchronously in useMemo to prevent flickering from post-render updates.
 */
const STLPiece: React.FC<STLPieceProps> = React.memo(({
  type,
  position,
  color = "white",
  transparent = true,
  opacity = 1,
  castShadow = true,
  receiveShadow = false
}) => {
  const originalGeometry = useLoader(STLLoader, configs[type].file)

  // Clone and transform geometry synchronously to prevent flickering
  // Only re-compute when geometry or type changes (not position/color)
  const geometry = useMemo(() => {
    const clonedGeometry = originalGeometry.clone()
    const config = configs[type]

    // Center the geometry around the origin
    clonedGeometry.computeBoundingBox()
    if (clonedGeometry.boundingBox) {
      const center = clonedGeometry.boundingBox.getCenter(new Vector3())
      clonedGeometry.translate(-center.x, -center.y, -center.z)
    }
    clonedGeometry.center()

    // Apply rotation directly to geometry (baked in)
    clonedGeometry.rotateX(config.x_rotation)

    // Apply scale directly to geometry (baked in)
    clonedGeometry.scale(config.scale, config.scale, config.scale)

    return clonedGeometry
  }, [originalGeometry, type])

  // Compute final position with y_offset
  const config = configs[type]
  const finalPosition: [number, number, number] = [
    position[0],
    position[1] + config.y_offset,
    position[2]
  ]

  return (
    <mesh
      position={finalPosition}
      geometry={geometry}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <meshStandardMaterial
        color={color}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  )
})

STLPiece.displayName = 'STLPiece'

export default STLPiece
