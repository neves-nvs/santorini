import { type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '@/shared/utils/usePageTitle'

const linkButtonStyle: CSSProperties = {
  flex: '1 1 140px',
  maxWidth: '200px',
  boxSizing: 'border-box',
  fontSize: 'clamp(0.9rem, 3vw, 1.2rem)',
  fontWeight: 500,
  padding: '0.75rem 1.5rem',
  border: '2px solid white',
  borderRadius: '8px',
  textAlign: 'center',
  textDecoration: 'none'
}

const HomePage = () => {
  usePageTitle('Board Game')
  return (
    <main className="page" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--brand-gradient)',
      color: 'white',
      padding: '1rem'
    }}>
      <h1 style={{
        fontSize: 'clamp(2rem, 8vw, 4rem)',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        Santorini
      </h1>
      <h2 style={{
        fontSize: 'clamp(1rem, 4vw, 1.5rem)',
        marginBottom: '2rem',
        textAlign: 'center',
        padding: '0 1rem'
      }}>
        The Strategic Board Game in 3D
      </h2>

      <nav aria-label="Main" style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '1rem',
        width: '100%',
        maxWidth: '500px'
      }}>
        <Link to="/auth" style={{
          ...linkButtonStyle,
          background: 'rgba(0, 0, 0, 0.3)',
          color: 'white'
        }}>
          Login / Register
        </Link>
        <Link to="/lobby" style={{
          ...linkButtonStyle,
          background: 'rgba(255, 255, 255, 0.9)',
          color: '#333'
        }}>
          Game Lobby
        </Link>
      </nav>
    </main>
  )
}

export default HomePage
