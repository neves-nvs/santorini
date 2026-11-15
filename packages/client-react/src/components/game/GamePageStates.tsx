import React from 'react'

interface GamePageContainerProps {
  children: React.ReactNode
}

const GamePageContainer: React.FC<GamePageContainerProps> = ({ children }) => (
  <main className="page">
    <div className="game-container" style={{
      background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {children}
    </div>
  </main>
)

interface GameLoadingStateProps {
  gameId?: string
}

export const GameLoadingState: React.FC<GameLoadingStateProps> = ({ gameId }) => (
  <GamePageContainer>
    <div role="status" style={{ textAlign: 'center', color: '#333' }}>
      <h1>Loading Game {gameId}...</h1>
      <p>Fetching game state...</p>
    </div>
  </GamePageContainer>
)

interface GameErrorStateProps {
  error: string
}

export const GameErrorState: React.FC<GameErrorStateProps> = ({ error }) => (
  <GamePageContainer>
    <div role="alert" style={{ textAlign: 'center', color: '#333' }}>
      <h1>Failed to Load Game</h1>
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  </GamePageContainer>
)

interface GameMainStateProps {
  children: React.ReactNode
}

export const GameMainState: React.FC<GameMainStateProps> = ({ children }) => (
  <main className="page">
    <h1 className="visually-hidden">Santorini game</h1>
    <div className="game-container" style={{
      background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)'
    }}>
      <div className="ui-overlay">
        {children}
      </div>
    </div>
  </main>
)
