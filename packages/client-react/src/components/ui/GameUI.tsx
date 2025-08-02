import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useGame } from '../../store/GameContext'
import { useWebSocket } from '../../hooks/useWebSocket'
import { apiService } from '../../services/ApiService'
import { gameplayService } from '../../services/GameplayService'
import GameBoard from '../game/GameBoard'

// Debug state interface
interface DebugState {
  showAxis: boolean
  showGrid: boolean
  showWireframe: boolean
  showStats: boolean
  showBoundingBoxes: boolean
  useSampleBoard: boolean
}

// Debug UI Component
const DebugMenu: React.FC<{
  debugState: DebugState
  onDebugChange: (key: keyof DebugState, value: boolean) => void
  gameContext: any
  isConnected: boolean
}> = ({ debugState, onDebugChange, gameContext, isConnected }) => {
  const [isOpen, setIsOpen] = useState(false)

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
        pointerEvents: 'auto',
        zIndex: 10001
      }}>
        <div style={{
          fontWeight: 'bold',
          marginBottom: '15px',
          fontSize: '14px'
        }}>
          🐛 Debug Menu
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}>
            <input
              type="checkbox"
              checked={debugState.showAxis}
              onChange={(e) => {
                e.stopPropagation()
                onDebugChange('showAxis', e.target.checked)
                console.log('Show Axis toggled:', e.target.checked)
              }}
              style={{ pointerEvents: 'auto' }}
            />
            Show XYZ Axis
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}>
            <input
              type="checkbox"
              checked={debugState.showGrid}
              onChange={(e) => {
                e.stopPropagation()
                onDebugChange('showGrid', e.target.checked)
                console.log('Show Grid toggled:', e.target.checked)
              }}
              style={{ pointerEvents: 'auto' }}
            />
            Show Grid
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}>
            <input
              type="checkbox"
              checked={debugState.showWireframe}
              onChange={(e) => {
                e.stopPropagation()
                onDebugChange('showWireframe', e.target.checked)
                console.log('Wireframe toggled:', e.target.checked)
              }}
              style={{ pointerEvents: 'auto' }}
            />
            Wireframe Mode
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}>
            <input
              type="checkbox"
              checked={debugState.showStats}
              onChange={(e) => {
                e.stopPropagation()
                onDebugChange('showStats', e.target.checked)
                console.log('Show Stats toggled:', e.target.checked)
              }}
              style={{ pointerEvents: 'auto' }}
            />
            Show Stats
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}>
            <input
              type="checkbox"
              checked={debugState.showBoundingBoxes}
              onChange={(e) => {
                e.stopPropagation()
                onDebugChange('showBoundingBoxes', e.target.checked)
                console.log('Show Bounding Boxes toggled:', e.target.checked)
              }}
              style={{ pointerEvents: 'auto' }}
            />
            Block Bounding Boxes
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}>
            <input
              type="checkbox"
              checked={debugState.useSampleBoard}
              onChange={(e) => {
                e.stopPropagation()
                onDebugChange('useSampleBoard', e.target.checked)
                console.log('Use Sample Board toggled:', e.target.checked)
              }}
              style={{ pointerEvents: 'auto' }}
            />
            Use Sample Board
          </label>

          <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
            <div style={{ fontSize: '11px', marginBottom: '5px', color: '#ccc' }}>Debug Actions:</div>
            <button
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                marginRight: '5px',
                background: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation()
                gameContext.setMyTurn(true)
                console.log('🔧 Debug: Set isMyTurn = true')
              }}
            >
              Set My Turn
            </button>
            <button
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                background: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation()
                gameContext.setMyTurn(false)
                console.log('🔧 Debug: Set isMyTurn = false')
              }}
            >
              Clear My Turn
            </button>
            <button
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                marginTop: '5px',
                background: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'block'
              }}
              onClick={(e) => {
                e.stopPropagation()
                console.log('🔧 Debug: Current WebSocket state:', {
                  isConnected,
                  gameState: gameContext.state.gameState,
                  isMyTurn: gameContext.state.isMyTurn,
                  availableMoves: gameContext.state.availableMoves.length
                })
              }}
            >
              Log Current State
            </button>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          padding: '10px 8px',
          cursor: 'pointer',
          borderRadius: '0 8px 8px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          minHeight: '40px',
          userSelect: 'none',
          pointerEvents: 'auto',
          zIndex: 10001
        }}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
          console.log('Debug toggle clicked:', !isOpen)
        }}
      >
        {isOpen ? '◀' : '▶'}
      </div>
    </div>
  )
}

// Helper function to get user-friendly game status
const getGameStatusDisplay = (gameState: any, isMyTurn: boolean) => {
  const gameStatus = gameState.game_status
  const gamePhase = gameState.game_phase
  const mainPhase = gameState.phase

  // Waiting for players to join/ready up
  if (gameStatus === 'waiting' || mainPhase === 'SETUP') {
    const readyCount = gameState.playersReadyStatus?.filter((p: any) => p.isReady).length || 0
    const totalPlayers = gameState.playersReadyStatus?.length || 0
    return `⏳ Waiting for players (${readyCount}/${totalPlayers} ready)`
  }

  // Game is starting
  if (gameStatus === 'ready' && gamePhase === 'waiting') {
    return `🚀 Game starting...`
  }

  // Worker placement phase
  if (gamePhase === 'placing') {
    console.log('Placement phase - isMyTurn:', isMyTurn, 'currentPlayer:', gameState.currentPlayer)
    return isMyTurn ? `🎯 Your turn - Place worker` : `⏳ Opponent placing worker`
  }

  // Movement phase
  if (gamePhase === 'moving') {
    return isMyTurn ? `🎯 Your turn - Move worker` : `⏳ Opponent moving`
  }

  // Building phase
  if (gamePhase === 'building') {
    return isMyTurn ? `🎯 Your turn - Build block` : `⏳ Opponent building`
  }

  // Game finished
  if (gameStatus === 'finished' || mainPhase === 'FINISHED') {
    return `🏆 Game finished`
  }

  // Fallback
  return `🎮 Game: ${gameStatus} | Phase: ${gamePhase}`
}

const GameUI = () => {
  const gameContext = useGame()
  const { state } = gameContext
  const { isConnected } = useWebSocket()
  const [isReady, setIsReady] = useState(false)
  const [isSettingReady, setIsSettingReady] = useState(false)

  // Debug state
  const [debugState, setDebugState] = useState<DebugState>({
    showAxis: true,
    showGrid: false,
    showWireframe: false,
    showStats: false,
    showBoundingBoxes: false,
    useSampleBoard: false
  })

  const handleDebugChange = (key: keyof DebugState, value: boolean) => {
    setDebugState(prev => ({ ...prev, [key]: value }))
  }

  // Initialize GameplayService with game context
  useEffect(() => {
    gameplayService.setGameContext(gameContext)
  }, [gameContext])

  // Sync ready state with server when game state updates
  useEffect(() => {
    if (state.gameState?.game_status === 'ready' && state.gameState?.currentUserReady !== undefined) {
      setIsReady(state.gameState.currentUserReady)
    }
  }, [state.gameState?.game_status, state.gameState?.currentUserReady])

  // Initialize ready state when component mounts or game state first loads
  useEffect(() => {
    if (state.gameState?.currentUserReady !== undefined) {
      setIsReady(state.gameState.currentUserReady)
    }
  }, [state.gameState?.currentUserReady])

  const handleReadyToggle = async () => {
    if (!state.gameId) return

    console.log('🎯 Ready toggle clicked:', {
      currentReadyState: isReady,
      newReadyState: !isReady,
      gameId: state.gameId,
      username: state.username
    })

    setIsSettingReady(true)
    const newReadyState = !isReady

    console.log('🎯 Sending ready status to backend:', newReadyState)
    const success = await apiService.setPlayerReady(state.gameId, newReadyState)
    console.log('🎯 Backend response success:', success)

    if (success) {
      setIsReady(newReadyState)
      console.log('🎯 Local ready state updated to:', newReadyState)
    } else {
      console.error('🎯 Failed to update ready status on backend')
    }
    setIsSettingReady(false)
  }

  return (
    <>
      {/* Full-screen 3D Game Board */}
      {state.gameState && (
        <GameBoard
          gameState={state.gameState}
          debugState={debugState}
          onCellClick={(x, y) => {
            console.log(`Clicked cell: ${x}, ${y}`)
            // TODO: Handle cell clicks for moves
          }}
        />
      )}

      {/* Debug: Show current game state */}
      {debugState.showStats && state.gameState && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          maxWidth: '300px',
          zIndex: 1000
        }}>
          <div><strong>Game State Debug:</strong></div>
          <div>Game Status: {state.gameState.game_status || 'N/A'}</div>
          <div>Main Phase: {state.gameState.phase || 'N/A'}</div>
          <div>Game Phase: {state.gameState.game_phase || 'N/A'}</div>
          <div>Current Player: {state.gameState.currentPlayer || 'N/A'}</div>
          <div>My Turn: <strong style={{color: state.isMyTurn ? 'lightgreen' : 'orange'}}>{state.isMyTurn ? 'YES' : 'NO'}</strong></div>
          <div>Available Moves: {state.availableMoves.length}</div>
          <div>Board: {state.gameState.board ? 'Present' : 'Missing'}</div>
          <div>Players Ready: {state.gameState.playersReadyStatus?.filter(p => p.isReady).length || 0}/{state.gameState.playersReadyStatus?.length || 0}</div>
          <div>Username: {state.username}</div>
          <div>Current Player: {state.gameState.currentPlayer}</div>
        </div>
      )}

      {/* Top Left - User Info */}
      <div className="top-left">
        <div className="ui-panel">
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Player:</strong> {state.username || 'Guest'}
          </div>
          <div>
            <strong>Status:</strong>
            <span style={{
              color: isConnected ? 'lightgreen' : (state.isConnecting ? 'yellow' : 'orange'),
              marginLeft: '0.5rem'
            }}>
              {isConnected ? 'Connected' : (state.isConnecting ? 'Connecting...' : 'Disconnected')}
            </span>
          </div>
          {state.gameId && (
            <div>
              <strong>Game ID:</strong> {state.gameId}
            </div>
          )}
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            <Link to="/lobby">
              <button>← Lobby</button>
            </Link>
            <Link to="/">
              <button>Home</button>
            </Link>
          </div>
        </div>
      </div>

      {/* Top Center - Game Status */}
      {state.gameState && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          zIndex: 1000,
          textAlign: 'center',
          minWidth: '300px'
        }}>
          {getGameStatusDisplay(state.gameState, state.isMyTurn)}
        </div>
      )}

      {/* Top Right - Game Info */}
      <div className="top-right">
        <div className="ui-panel">
          <h3>Game Status</h3>
          {state.gameState ? (
            <div>
              <div><strong>Status:</strong>
                <span style={{
                  color: state.gameState.game_status === 'waiting' ? 'orange' :
                        state.gameState.game_status === 'in-progress' ? 'lightgreen' : 'gray',
                  marginLeft: '0.5rem'
                }}>
                  {state.gameState.game_status || 'Unknown'}
                </span>
              </div>

              {state.gameState.game_status === 'waiting' && (
                <div style={{ color: 'orange', marginTop: '0.5rem' }}>
                  Waiting for players to join...
                </div>
              )}

              {state.gameState.game_status === 'ready' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ color: 'yellow', marginBottom: '0.5rem' }}>
                    All players joined! Ready to start?
                  </div>
                  <button
                    onClick={handleReadyToggle}
                    disabled={isSettingReady || isReady || state.gameState?.currentUserReady}
                    style={{
                      padding: '0.5rem 1rem',
                      background: (isReady || state.gameState?.currentUserReady) ? '#666666' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (isSettingReady || isReady || state.gameState?.currentUserReady) ? 'not-allowed' : 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    {isSettingReady ? 'Setting...' : ((isReady || state.gameState?.currentUserReady) ? 'Waiting for other players' : 'Ready to Start Game')}
                  </button>
                </div>
              )}

              {state.gameState.game_status === 'in-progress' && (
                <div style={{ color: 'lightgreen', marginTop: '0.5rem' }}>
                  Game is active! Ready to play.
                </div>
              )}

              {state.gameState.game_phase && (
                <div><strong>Phase:</strong> {state.gameState.game_phase}</div>
              )}

              {state.gameState.current_player_id && (
                <div><strong>Current Player:</strong> {state.gameState.current_player_id}</div>
              )}

              {state.gameState.winner_id && (
                <div><strong>Winner:</strong> {state.gameState.winner_id}</div>
              )}
            </div>
          ) : (
            <div>No game loaded</div>
          )}
        </div>
      </div>

      {/* Bottom Left - Available Plays */}
      <div className="bottom-left">
        <div className="ui-panel">
          <h3>Available Moves</h3>
          {state.availablePlays.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '1rem' }}>
              {state.availablePlays.map((play, index) => (
                <li key={index}>
                  {play.type} {play.position && `at (${play.position.x}, ${play.position.y})`}
                </li>
              ))}
            </ul>
          ) : (
            <p>No moves available</p>
          )}
        </div>
      </div>

      {/* Bottom Right - Players */}
      <div className="bottom-right">
        <div className="ui-panel">
          <h3>Players</h3>
          {state.gameState?.players ? (
            <div>
              {Array.isArray(state.gameState.players) ? (
                <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                  {state.gameState.players.map((playerId: any, index: number) => (
                    <li key={String(playerId)}>
                      <span style={{ color: index === 0 ? 'blue' : 'red' }}>●</span> Player {String(playerId)}
                      {playerId === state.gameState?.currentPlayer && ' (Current)'}
                    </li>
                  ))}
                </ul>
              ) : (
                <div>Players: {JSON.stringify(state.gameState.players)}</div>
              )}
            </div>
          ) : (
            <p>No players</p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 0, 0, 0.9)',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          <strong>Error:</strong> {state.error}
        </div>
      )}

      {/* Debug Menu */}
      <DebugMenu
        debugState={debugState}
        onDebugChange={handleDebugChange}
        gameContext={gameContext}
        isConnected={isConnected}
      />
    </>
  )
}

export default GameUI
