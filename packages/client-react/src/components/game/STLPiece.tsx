import React, { useRef, useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { Mesh, Box3, Vector3 } from 'three'
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
 */
const STLPiece: React.FC<STLPieceProps> = ({
  type,
  position,
  color = "white",
  transparent = true,
  opacity = 1,
  castShadow = true,
  receiveShadow = false
}) => {
  const originalGeometry = useLoader(STLLoader, configs[type].file)
  const meshRef = useRef<Mesh>(null)

  // Clone geometry and center it to ensure each instance is independent and properly positioned
  const geometry = useMemo(() => {
    const clonedGeometry = originalGeometry.clone()

    // Center the geometry around the origin for consistent positioning
    // Use computeBoundingBox instead of setFromObject for raw geometry
    clonedGeometry.computeBoundingBox()
    if (clonedGeometry.boundingBox) {
      const center = clonedGeometry.boundingBox.getCenter(new Vector3())
      clonedGeometry.translate(-center.x, -center.y, -center.z)

      // Geometry centered for proper positioning
    }

    return clonedGeometry
  }, [originalGeometry, position, color, type]) // Re-clone when position or color changes
  
  useEffect(() => {
    if (meshRef.current && meshRef.current.geometry) {
      const config = configs[type]

      // Center the geometry first (like original client does)
      meshRef.current.geometry.center()

      // Apply settings exactly like original applyImportSettings function
      meshRef.current.rotation.x = config.x_rotation
      meshRef.current.position.y = position[1] + config.y_offset // Add offset to base position
      meshRef.current.scale.set(config.scale, config.scale, config.scale)
    }
  }, [type, position])

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1], position[2]]} // Base position
      geometry={geometry}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <meshStandardMaterial
        color={color}
        transparent={transparent}
        opacity={opacity}
        onUpdate={() => {
          // Material updated
        }}
      />
    </mesh>
  )
}

export default STLPiece
