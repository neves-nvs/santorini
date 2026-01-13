import { useState, memo } from 'react'
import type { CameraType } from '../game/GameBoard'

// Debug state interface
export interface DebugState {
  showAxis: boolean
  showGrid: boolean
  showWireframe: boolean
  showStats: boolean
  showBoundingBoxes: boolean
  useSampleBoard: boolean
  showPerformance: boolean
}

interface DebugMenuProps {
  debugState: DebugState
  onDebugChange: (key: keyof DebugState, value: boolean) => void
  cameraType: CameraType
  onToggleCamera: () => void
  gameContext: any
  isConnected: boolean
}

/**
 * Debug menu for development - only shown in debug builds
 * Provides controls for various debug visualizations
 */
const DebugMenu = memo(({ debugState, onDebugChange, cameraType, onToggleCamera, gameContext, isConnected }: DebugMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const panelWidth = 200

  return (
    <div style={{
      position: 'fixed',
      left: isOpen ? '0' : `-${panelWidth}px`,
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      zIndex: 10000,
      transition: 'left 0.3s ease-in-out',
      pointerEvents: 'auto'
    }}>
      {/* Panel */}
      <div style={{
        width: `${panelWidth}px`,
        padding: '15px',
        maxHeight: '80vh',
        overflowY: 'auto',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        fontSize: '12px',
        boxSizing: 'border-box',
        pointerEvents: 'auto'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>Debug Menu</h4>
        
        {/* Connection Status */}
        <div style={{ marginBottom: '10px', fontSize: '11px' }}>
          Status: <span style={{ color: isConnected ? '#4CAF50' : '#f44336' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Camera Toggle */}
        <button
          onClick={onToggleCamera}
          style={{
            width: '100%',
            padding: '6px 8px',
            marginBottom: '10px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            pointerEvents: 'auto'
          }}
        >
          Camera: {cameraType === 'orthographic' ? 'Ortho' : 'Persp'} (C)
        </button>

        {/* Debug Controls */}
        {Object.entries(debugState).map(([key, value]) => (
          <label key={key} style={{
            display: 'block',
            marginBottom: '8px',
            cursor: 'pointer',
            fontSize: '11px'
          }}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onDebugChange(key as keyof DebugState, e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </label>
        ))}

        {/* Game Context Info */}
        <div style={{ 
          marginTop: '15px', 
          padding: '8px', 
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          fontSize: '10px'
        }}>
          <div><strong>Game Phase:</strong> {gameContext.state.gameState?.game_phase || 'N/A'}</div>
          <div><strong>Current Player:</strong> {gameContext.state.gameState?.currentPlayer || 'N/A'}</div>
          <div><strong>My Turn:</strong> <strong style={{ color: gameContext.state.isMyTurn ? 'lightgreen' : 'orange' }}>
            {gameContext.state.isMyTurn ? 'YES' : 'NO'}
          </strong></div>
          <div><strong>Available Moves:</strong> {gameContext.state.currentPlayerMoves.length}</div>
          <div><strong>Board:</strong> {gameContext.state.gameState?.board ? 'Present' : 'Missing'}</div>
          <div><strong>Players Ready:</strong> {gameContext.state.gameState?.playersReadyStatus?.filter((p: any) => p.isReady).length || 0}/{gameContext.state.gameState?.playersReadyStatus?.length || 0}</div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '10px 5px',
          cursor: 'pointer',
          borderRadius: '0 8px 8px 0',
          fontSize: '12px',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          pointerEvents: 'auto',
          flexShrink: 0
        }}
      >
        DEBUG
      </button>
    </div>
  )
})

DebugMenu.displayName = 'DebugMenu'

export default DebugMenu
