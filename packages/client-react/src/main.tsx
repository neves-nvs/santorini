import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { handleConnectionChange, handleWebSocketMessage, resetMessageHandlerState } from './game/update/GameMessageHandler'
import { webSocketClient } from './game/services/WebSocketClient'
import './index.css'

webSocketClient.setEvents({
  onMessage: handleWebSocketMessage,
  onConnectionChange: handleConnectionChange,
  onReset: resetMessageHandlerState,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
