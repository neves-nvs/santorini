import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userApi } from '@/user/services/userApi'
import { useAppStore } from '@/user/model/appStore'

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [usernameInput, setUsernameInput] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const usernameId = useId()
  const passwordId = useId()
  const errorId = useId()
  const setUser = useAppStore((s) => s.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        // Login
        await userApi.login({ username: usernameInput, password })
        // Get user info after login
        const userInfo = await userApi.checkAuth()
        if (userInfo) {
          setUser(userInfo)
        }
        navigate('/lobby')
      } else {
        // Register
        await userApi.createUser({ username: usernameInput, password })
        // After successful registration, automatically login
        await userApi.login({ username: usernameInput, password })
        // Get user info after login
        const userInfo = await userApi.checkAuth()
        if (userInfo) {
          setUser(userInfo)
        }
        navigate('/lobby')
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--brand-gradient)',
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        padding: 'clamp(1.5rem, 5vw, 3rem)',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#333'
        }}>
          {isLogin ? 'Login' : 'Register'}
        </h1>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div id={errorId} role="alert" style={{
              background: '#fee',
              color: '#b91c1c',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor={usernameId} style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>
              Username
            </label>
            <input
              id={usernameId}
              type="text"
              autoComplete="username"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              required
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label htmlFor={passwordId} style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#ccc' : 'var(--brand-accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1.1rem',
              marginBottom: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brand-accent)',
              textDecoration: 'underline',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
          </button>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <Link to="/" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}

export default AuthPage
