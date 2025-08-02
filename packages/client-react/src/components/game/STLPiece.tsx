import React, { useRef, useEffect } from 'react'
import { useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { Mesh } from 'three'
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
  const geometry = useLoader(STLLoader, configs[type].file)
  const meshRef = useRef<Mesh>(null)
  
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
      />
    </mesh>
  )
}

export default STLPiece
