import { useState, memo } from 'react'

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
  gameContext: any
  isConnected: boolean
}

/**
 * Debug menu for development - only shown in debug builds
 * Provides controls for various debug visualizations
 */
const DebugMenu = memo(({ debugState, onDebugChange, gameContext, isConnected }: DebugMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      left: isOpen ? '10px' : '-180px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      borderRadius: '0 8px 8px 0',
      fontSize: '12px',
      zIndex: 10000,
      transition: 'left 0.3s ease-in-out',
      display: 'flex',
      alignItems: 'center'
    }}>
      {/* Expandable content */}
      <div style={{
        padding: '15px',
        width: '180px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>Debug Menu</h4>
        
        {/* Connection Status */}
        <div style={{ marginBottom: '10px', fontSize: '11px' }}>
          Status: <span style={{ color: isConnected ? '#4CAF50' : '#f44336' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

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
          textOrientation: 'mixed'
        }}
      >
        DEBUG
      </button>
    </div>
  )
})

DebugMenu.displayName = 'DebugMenu'

export default DebugMenu
