import { useState, useEffect } from 'react'
import { useIsConnected } from '../../features/game/store/gameSelectors'
import { webSocketClient } from '../../features/game/services/WebSocketClient'
import { apiService } from '../../services/ApiService'

const ConnectionTest = () => {
  const isConnected = useIsConnected()
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testWebSocketConnection = () => {
    addResult(`WebSocket connected: ${isConnected}`)
    if (isConnected) {
      webSocketClient.send('test_message', { test: 'Hello from React!' })
      addResult('Sent test message to WebSocket')
    }
  }

  const testHttpConnection = async () => {
    try {
      const games = await apiService.getGames()
      addResult(`HTTP API working - Found ${games.length} games`)
    } catch (error) {
      addResult(`HTTP API error: ${error}`)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  useEffect(() => {
    addResult(`Component mounted - WebSocket: ${isConnected ? 'Connected' : 'Disconnected'}`)
  }, [isConnected])

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '1rem',
      borderRadius: '8px',
      minWidth: '400px',
      maxHeight: '200px',
      overflow: 'auto',
      zIndex: 1000
    }}>
      <h4>Connection Test</h4>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={testWebSocketConnection} style={{ marginRight: '0.5rem' }}>
          Test WebSocket
        </button>
        <button onClick={testHttpConnection} style={{ marginRight: '0.5rem' }}>
          Test HTTP API
        </button>
        <button onClick={clearResults}>
          Clear
        </button>
      </div>
      
      <div style={{ 
        maxHeight: '100px', 
        overflow: 'auto', 
        fontSize: '0.8rem',
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '0.5rem',
        borderRadius: '4px'
      }}>
        {testResults.length === 0 ? (
          <div>No test results yet</div>
        ) : (
          testResults.map((result, index) => (
            <div key={index}>{result}</div>
          ))
        )}
      </div>
    </div>
  )
}

export default ConnectionTest
