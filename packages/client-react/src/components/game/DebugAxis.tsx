import React from 'react'

interface DebugAxisProps {
  visible?: boolean
  size?: number
}

const DebugAxis: React.FC<DebugAxisProps> = ({ visible = true, size = 5 }) => {
  if (!visible) return null

  return (
    <group>
      {/* X Axis - Red (horizontal) */}
      <mesh position={[size / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, size]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh position={[size, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.3]} />
        <meshBasicMaterial color="red" />
      </mesh>
      
      {/* Y Axis - Green (vertical) */}
      <mesh position={[0, size / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, size]} />
        <meshBasicMaterial color="green" />
      </mesh>
      <mesh position={[0, size, 0]}>
        <coneGeometry args={[0.1, 0.3]} />
        <meshBasicMaterial color="green" />
      </mesh>
      
      {/* Z Axis - Blue (depth) */}
      <mesh position={[0, 0, size / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, size]} />
        <meshBasicMaterial color="blue" />
      </mesh>
      <mesh position={[0, 0, size]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.3]} />
        <meshBasicMaterial color="blue" />
      </mesh>
      
      {/* Origin marker at exact center (0,0,0) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.15]} />
        <meshBasicMaterial color="yellow" />
      </mesh>
      
      {/* Axis labels */}
      <mesh position={[size + 0.5, 0, 0]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshBasicMaterial color="red" />
      </mesh>
      
      <mesh position={[0, size + 0.5, 0]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshBasicMaterial color="green" />
      </mesh>
      
      <mesh position={[0, 0, size + 0.5]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshBasicMaterial color="blue" />
      </mesh>
      
      {/* Grid reference points for board coordinates (-2 to +2) */}
      {[-2, -1, 1, 2].map(x => (
        <mesh key={`x-grid-${x}`} position={[x, 0, 0]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshBasicMaterial color="red" transparent opacity={0.5} />
        </mesh>
      ))}
      
      {[-2, -1, 1, 2].map(z => (
        <mesh key={`z-grid-${z}`} position={[0, 0, z]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshBasicMaterial color="blue" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export default DebugAxis
