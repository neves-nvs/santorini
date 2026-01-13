import { Link } from 'react-router-dom'

const HomePage = () => {
  return (
    <div className="page" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

      <nav style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '1rem',
        width: '100%',
        maxWidth: '500px'
      }}>
        <Link to="/auth" style={{ flex: '1 1 140px', maxWidth: '200px' }}>
          <button style={{
            fontSize: 'clamp(0.9rem, 3vw, 1.2rem)',
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid white',
            color: 'white',
            width: '100%'
          }}>
            Login / Register
          </button>
        </Link>
        <Link to="/lobby" style={{ flex: '1 1 140px', maxWidth: '200px' }}>
          <button style={{
            fontSize: 'clamp(0.9rem, 3vw, 1.2rem)',
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '2px solid white',
            color: '#333',
            width: '100%'
          }}>
            Game Lobby
          </button>
        </Link>
      </nav>
    </div>
  )
}

export default HomePage
