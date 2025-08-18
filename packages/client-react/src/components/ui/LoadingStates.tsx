import React from 'react'

// Skeleton loader for the game board
export const BoardSkeleton: React.FC = () => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      position: 'relative'
    }}>
      {/* Animated loading grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridTemplateRows: 'repeat(5, 1fr)',
        gap: '4px',
        width: '200px',
        height: '200px'
      }}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#ddd',
              borderRadius: '4px',
              animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite alternate`
            }}
          />
        ))}
      </div>
      
      {/* Loading text */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        color: '#666',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        Loading game board...
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// Loading spinner for general use
export const LoadingSpinner: React.FC<{ size?: number; color?: string }> = ({ 
  size = 40, 
  color = '#4444ff' 
}) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid #f3f3f3`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    >
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Connection status indicator
export const ConnectionStatus: React.FC<{ 
  isConnected: boolean
  isConnecting: boolean 
}> = ({ isConnected, isConnecting }) => {
  if (isConnecting) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: '#fff3cd',
        color: '#856404',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <LoadingSpinner size={16} color="#856404" />
        Connecting to game server...
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: '#dc3545',
          borderRadius: '50%'
        }} />
        Disconnected from server
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: '#d4edda',
      color: '#155724',
      borderRadius: '4px',
      fontSize: '12px'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        backgroundColor: '#28a745',
        borderRadius: '50%'
      }} />
      Connected
    </div>
  )
}

// Game loading overlay
export const GameLoadingOverlay: React.FC<{ 
  message?: string
  progress?: number 
}> = ({ 
  message = 'Loading game...', 
  progress 
}) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <LoadingSpinner size={60} />
      <div style={{
        marginTop: '20px',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333'
      }}>
        {message}
      </div>
      
      {progress !== undefined && (
        <div style={{
          marginTop: '15px',
          width: '200px',
          height: '4px',
          backgroundColor: '#e0e0e0',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#4444ff',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
    </div>
  )
}
