import { 
  YourTurnMessage, 
  GameUpdateMessage, 
  MakeMoveMessage, 
  PlaceWorkerMove,
  AvailableMove 
} from '../types/game'
import { webSocketService } from './WebSocketService'

/**
 * Service for handling gameplay WebSocket messages and move submission
 */
class GameplayService {
  private gameContext: any = null

  /**
   * Initialize with game context for state updates
   */
  setGameContext(context: any) {
    this.gameContext = context
  }

  /**
   * Check if the game has actually started (past waiting phase)
   */
  private isGameStarted(gameState: any): boolean {
    // Game must be in progress status
    const isInProgress = gameState.game_status === 'in-progress'

    // Game phase must be past waiting (placing, moving, or building)
    const isGameplayPhase = gameState.game_phase &&
      ['placing', 'moving', 'building'].includes(gameState.game_phase)

    console.log('🔍 isGameStarted check:', {
      game_status: gameState.game_status,
      game_phase: gameState.game_phase,
      isInProgress,
      isGameplayPhase,
      result: isInProgress && isGameplayPhase
    })

    return isInProgress && isGameplayPhase
  }

  /**
   * Handle incoming WebSocket messages related to gameplay
   */
  handleMessage(message: any) {
    console.log('🎮 GameplayService.handleMessage() called!')
    console.log('🎮 GameplayService received message:', message)
    console.log('🎮 Message type:', message.type)
    console.log('🎮 Message payload:', message.payload)
    console.log('🎮 GameContext available:', !!this.gameContext)

    switch (message.type) {
      case 'your_turn':
        console.log('🎯 Processing YOUR_TURN message')
        this.handleYourTurn(message as YourTurnMessage)
        break

      case 'game_update':
        console.log('📢 Processing GAME_UPDATE message')
        this.handleGameUpdate(message as GameUpdateMessage)
        break

      case 'available_plays':
        console.log('🎯 Processing AVAILABLE_PLAYS message (backend format)')
        this.handleAvailablePlays(message)
        break

      case 'game_state_update':
        console.log('📢 Processing GAME_STATE_UPDATE message (backend format)')
        this.handleGameStateUpdate(message)
        break

      case 'move_acknowledged':
        console.log('✅ Processing MOVE_ACKNOWLEDGED message')
        this.handleMoveAcknowledged(message)
        break

      default:
        console.log('❓ Unhandled gameplay message type:', message.type)
        console.log('❓ Full message:', JSON.stringify(message, null, 2))
    }
  }

  /**
   * Handle "your_turn" message - it's the player's turn to move
   */
  private handleYourTurn(message: YourTurnMessage) {
    if (!this.gameContext) {
      console.error('Game context not set')
      return
    }

    console.log('🎯 YOUR_TURN message received:', message)
    console.log('🎯 Current gameContext state before update:', {
      isMyTurn: this.gameContext.state.isMyTurn,
      availableMoves: this.gameContext.state.availableMoves.length,
      gameState: this.gameContext.state.gameState
    })

    // Update game state
    this.gameContext.setGameState(message.gameState)

    // Only set available moves and turn state if game is actually ready for gameplay
    const gameState = message.gameState
    const isGameStarted = this.isGameStarted(gameState)

    if (isGameStarted) {
      // Set available moves
      this.gameContext.setAvailableMoves(message.availableMoves)

      // Mark as player's turn
      this.gameContext.setMyTurn(true)

      console.log('Game has started, setting available moves:', message.availableMoves)
    } else {
      // Game not started yet, clear moves and turn state
      this.gameContext.setAvailableMoves([])
      this.gameContext.setMyTurn(false)

      console.log('Game not started yet, clearing moves. Status:', gameState.game_status, 'Phase:', gameState.phase, 'Game Phase:', gameState.game_phase)
    }

    // Clear any errors
    this.gameContext.setError(null)
  }

  /**
   * Handle "game_update" message - game state has changed
   */
  private handleGameUpdate(message: GameUpdateMessage) {
    if (!this.gameContext) {
      console.error('Game context not set')
      return
    }

    console.log('📢 GAME_UPDATE message received:', message)
    console.log('📢 Setting isMyTurn to FALSE (not my turn after update)')
    
    // Update game state
    this.gameContext.setGameState(message.gameState)
    
    // Clear available moves (not our turn)
    this.gameContext.setAvailableMoves([])
    
    // Mark as not our turn
    this.gameContext.setMyTurn(false)
    
    // TODO: Show animation of last move if provided
    if (message.lastMove) {
      console.log('Last move:', message.lastMove)
      // Could trigger animations here
    }
  }

  /**
   * Handle "available_plays" message - backend format for available moves
   */
  private handleAvailablePlays(message: any) {
    if (!this.gameContext) {
      console.error('Game context not set')
      return
    }

    console.log('🎯 Available plays received (backend format):', message.payload)

    // If we receive available plays, it means it's our turn
    if (message.payload && Array.isArray(message.payload) && message.payload.length > 0) {
      console.log('🎯 Setting isMyTurn = TRUE (received available plays)')
      this.gameContext.setMyTurn(true)

      // Convert backend plays to our AvailableMove format
      const availableMoves = this.convertBackendPlaysToMoves(message.payload)
      this.gameContext.setAvailableMoves(availableMoves)
    } else {
      console.log('🎯 No available plays, setting isMyTurn = FALSE')
      this.gameContext.setMyTurn(false)
      this.gameContext.setAvailableMoves([])
    }
  }

  /**
   * Handle "game_state_update" message - backend format for game state changes
   */
  private handleGameStateUpdate(message: any) {
    if (!this.gameContext) {
      console.error('Game context not set')
      return
    }

    console.log('📢 Game state update received (backend format):', message.payload)

    // Update game state
    if (message.payload) {
      this.gameContext.setGameState(message.payload)
    }

    // Game state updates typically mean it's not our turn anymore
    // (unless we also receive available_plays)
    console.log('📢 Game state updated, clearing turn state')
    this.gameContext.setMyTurn(false)
    this.gameContext.setAvailableMoves([])
  }

  /**
   * Convert backend plays format to our AvailableMove format
   */
  private convertBackendPlaysToMoves(backendPlays: any[]): AvailableMove[] {
    console.log('🔄 Converting backend plays to moves:', backendPlays)

    if (!Array.isArray(backendPlays)) {
      console.warn('Backend plays is not an array:', backendPlays)
      return []
    }

    // During placing phase, we need to assign workers to positions
    // For simplicity, we'll create moves for worker 1 (first worker to be placed)
    const placingMoves = backendPlays.filter(play => play.type === 'place_worker')

    if (placingMoves.length > 0) {
      const availableMove: AvailableMove = {
        type: 'place_worker',
        workerId: 1, // For placing phase, start with worker 1
        validPositions: placingMoves.map(play => ({
          x: play.position.x,
          y: play.position.y
        }))
      }

      console.log('🔄 Converted to AvailableMove:', availableMove)
      console.log('🔄 Valid positions count:', availableMove.validPositions.length)

      return [availableMove]
    }

    console.warn('No valid placing moves found in backend plays')
    return []
  }

  /**
   * Handle "move_acknowledged" message - backend confirmed our move
   */
  private handleMoveAcknowledged(message: any) {
    if (!this.gameContext) {
      console.error('Game context not set')
      return
    }

    console.log('✅ Move acknowledged by backend:', message.payload)

    if (message.payload?.success) {
      console.log('✅ Move was successful:', message.payload.move)
      // Move was successful - the backend should send updated game state and next player's available moves
      // For now, just log the success
    } else {
      console.error('❌ Move was rejected by backend:', message.payload)
      // TODO: Handle move rejection - restore previous state, show error message
    }
  }

  /**
   * Submit a worker placement move
   */
  submitPlaceWorkerMove(workerId: 1 | 2, position: { x: number, y: number }) {
    if (!this.gameContext || !this.gameContext.state.gameId) {
      console.error('Cannot submit move: no game context or game ID')
      return
    }

    const move: PlaceWorkerMove = {
      type: 'place_worker',
      workerId,
      position
    }

    const message = {
      type: 'make_move',
      gameId: this.gameContext.state.gameId,
      move
    }

    console.log('Submitting move:', message)

    // Send via WebSocket
    webSocketService.send('make_move', {
      gameId: this.gameContext.state.gameId,
      move
    })

    // Optimistically clear available moves and turn state
    this.gameContext.setAvailableMoves([])
    this.gameContext.setMyTurn(false)
  }

  /**
   * Check if a position is valid for the current available moves
   */
  isValidMove(x: number, y: number): { valid: boolean, workerId?: 1 | 2 } {
    if (!this.gameContext) {
      return { valid: false }
    }

    // Check if it's actually the player's turn and game is in progress
    if (!this.gameContext.state.isMyTurn) {
      console.log('Not your turn, move invalid')
      return { valid: false }
    }

    const gameState = this.gameContext.state.gameState
    const isGameStarted = gameState ? this.isGameStarted(gameState) : false

    if (!isGameStarted) {
      console.log('Game not started, move invalid. Status:', gameState?.game_status, 'Phase:', gameState?.phase, 'Game Phase:', gameState?.game_phase)
      return { valid: false }
    }

    const availableMoves: AvailableMove[] = this.gameContext.state.availableMoves

    for (const move of availableMoves) {
      const validPosition = move.validPositions.find(pos => pos.x === x && pos.y === y)
      if (validPosition) {
        return { valid: true, workerId: move.workerId }
      }
    }

    return { valid: false }
  }

  /**
   * Get all valid positions for highlighting
   */
  getValidPositions(): Array<{ x: number, y: number, workerId: 1 | 2 }> {
    if (!this.gameContext) {
      return []
    }

    const availableMoves: AvailableMove[] = this.gameContext.state.availableMoves
    const positions: Array<{ x: number, y: number, workerId: 1 | 2 }> = []
    
    for (const move of availableMoves) {
      for (const pos of move.validPositions) {
        positions.push({
          x: pos.x,
          y: pos.y,
          workerId: move.workerId
        })
      }
    }
    
    return positions
  }
}

// Export singleton instance
export const gameplayService = new GameplayService()
