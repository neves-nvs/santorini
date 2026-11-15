import { Link } from 'react-router-dom'

const NotFoundPage = () => (
  <main className="page" style={{
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--brand-gradient)',
    color: 'white',
    padding: '1rem',
    textAlign: 'center'
  }}>
    <h1>Page not found</h1>
    <p style={{ marginBottom: '2rem' }}>There is nothing at this address.</p>
    <Link to="/" style={{ color: 'white', fontSize: '1.1rem' }}>
      Back to Home
    </Link>
  </main>
)

export default NotFoundPage
