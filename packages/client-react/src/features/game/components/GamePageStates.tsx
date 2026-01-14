import React from 'react'

interface GamePageContainerProps {
  children: React.ReactNode
}

const GamePageContainer: React.FC<GamePageContainerProps> = ({ children }) => (
  <div className="page">
    <div className="game-container" style={{
      background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {children}
    </div>
  </div>
)

interface GameLoadingStateProps {
  gameId?: string
}

export const GameLoadingState: React.FC<GameLoadingStateProps> = ({ gameId }) => (
  <GamePageContainer>
    <div style={{ textAlign: 'center', color: '#333' }}>
      <h2>Loading Game {gameId}...</h2>
      <p>Fetching game state...</p>
    </div>
  </GamePageContainer>
)

interface GameErrorStateProps {
  error: string
}

export const GameErrorState: React.FC<GameErrorStateProps> = ({ error }) => (
  <GamePageContainer>
    <div style={{ textAlign: 'center', color: '#333' }}>
      <h2>Failed to Load Game</h2>
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  </GamePageContainer>
)

interface GameMainStateProps {
  children: React.ReactNode
}

export const GameMainState: React.FC<GameMainStateProps> = ({ children }) => (
  <div className="page">
    <div className="game-container" style={{
      background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)'
    }}>
      <div className="ui-overlay">
        {children}
      </div>
    </div>
  </div>
)
