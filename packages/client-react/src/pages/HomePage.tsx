import { Link } from 'react-router-dom'

const HomePage = () => {
  return (
    <div className="page" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '2rem', textAlign: 'center' }}>
        Santorini
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '3rem', textAlign: 'center' }}>
        The Strategic Board Game in 3D
      </h2>
      
      <nav style={{ display: 'flex', gap: '2rem' }}>
        <Link to="/auth">
          <button style={{ 
            fontSize: '1.2rem', 
            padding: '1rem 2rem',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid white',
            color: 'white'
          }}>
            Login / Register
          </button>
        </Link>
        <Link to="/lobby">
          <button style={{
            fontSize: '1.2rem',
            padding: '1rem 2rem',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '2px solid white',
            color: '#333'
          }}>
            Game Lobby
          </button>
        </Link>
      </nav>
    </div>
  )
}

export default HomePage
