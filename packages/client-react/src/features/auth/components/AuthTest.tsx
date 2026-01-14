import { useState } from 'react'
import { apiService } from '../../../services/ApiService'

const AuthTest = () => {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testCreateUser = async () => {
    setLoading(true)
    try {
      const username = `testuser${Date.now()}`
      const password = 'testpass123'
      
      console.log('Creating user:', { username, password })
      const result = await apiService.createUser({ username, password })
      console.log('User created:', result)
      setResult(`User created: ${JSON.stringify(result)}`)
    } catch (error) {
      console.error('Create user error:', error)
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    setLoading(true)
    try {
      const result = await apiService.login({ username: 'testuser', password: 'testpass123' })
      console.log('Login result:', result)
      setResult(`Login successful: ${JSON.stringify(result)}`)
    } catch (error) {
      console.error('Login error:', error)
      setResult(`Login error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testGetGames = async () => {
    setLoading(true)
    try {
      const games = await apiService.getGames()
      console.log('Games:', games)
      setResult(`Games: ${JSON.stringify(games)}`)
    } catch (error) {
      console.error('Get games error:', error)
      setResult(`Get games error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '320px', // Move to the left of ConnectionTest
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '1rem',
      borderRadius: '8px',
      minWidth: '300px',
      zIndex: 1000
    }}>
      <h4>Auth Test Panel</h4>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={testCreateUser} disabled={loading} style={{ marginRight: '0.5rem' }}>
          Create User
        </button>
        <button onClick={testLogin} disabled={loading} style={{ marginRight: '0.5rem' }}>
          Login
        </button>
        <button onClick={testGetGames} disabled={loading}>
          Get Games
        </button>
      </div>
      
      <div style={{ 
        maxHeight: '200px', 
        overflow: 'auto', 
        fontSize: '0.8rem',
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '0.5rem',
        borderRadius: '4px',
        wordBreak: 'break-all'
      }}>
        {loading ? 'Loading...' : result || 'No results yet'}
      </div>
    </div>
  )
}

export default AuthTest
