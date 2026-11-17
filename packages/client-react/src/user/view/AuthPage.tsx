import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { USERNAME_RULE, createUserRequestSchema } from '@santorini/shared'
import { userApi } from '@/user/services/userApi'
import { useAppStore } from '@/user/model/appStore'
import { usePageTitle } from '@/shared/utils/usePageTitle'
import './AuthPage.css'

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [usernameInput, setUsernameInput] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  usePageTitle(isLogin ? 'Login' : 'Register')
  const navigate = useNavigate()
  const usernameId = useId()
  const passwordId = useId()
  const errorId = useId()
  const usernameHintId = useId()
  const setUser = useAppStore((s) => s.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isLogin) {
      const checked = createUserRequestSchema.safeParse({ username: usernameInput, password })
      if (!checked.success) {
        setError(checked.error.issues.map((issue) => issue.message).join(', '))
        return
      }
    }

    setLoading(true)

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
    <main className="page auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{isLogin ? 'Login' : 'Register'}</h1>

        <form onSubmit={handleSubmit}>
          {error && (
            <div id={errorId} role="alert" className="auth-error">
              {error}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor={usernameId} className="auth-label">
              Username
            </label>
            <input
              id={usernameId}
              className="auth-input"
              type="text"
              autoComplete="username"
              aria-invalid={error ? true : undefined}
              aria-describedby={[isLogin ? undefined : usernameHintId, error ? errorId : undefined].filter(Boolean).join(' ') || undefined}
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
              disabled={loading}
            />
            {!isLogin && (
              <p id={usernameHintId} className="auth-hint">
                {USERNAME_RULE}
              </p>
            )}
          </div>

          <div className="auth-field auth-field--last">
            <label htmlFor={passwordId} className="auth-label">
              Password
            </label>
            <input
              id={passwordId}
              className="auth-input"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="auth-centered">
          <button className="auth-switch" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
          </button>
        </div>

        <div className="auth-centered">
          <Link to="/" className="auth-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}

export default AuthPage
