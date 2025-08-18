import {
  YourTurnMessage,
  GameUpdateMessage,
  PlaceWorkerMove,
  AvailableMove
} from '../types/game'
import { webSocketService } from './WebSocketService'
import { MOVE_TIMEOUT } from '../constants/gameConstants'
import { ErrorHandler, ErrorType, ERROR_MESSAGES } from '../utils/errorHandler'

/**
 * Service for handling gameplay WebSocket messages and move submission
 */
class GameplayService {
  private gameContext: any = null
  private previousState: {
    currentPlayerMoves: AvailableMove[]
    isMyTurn: boolean
  } | null = null

  /**
   * Initialize with game context for state updates
   */
  setGameContext(context: any) {
    this.gameContext = context
  }

  /**
   * Save current state for potential rollback
   */
  private saveStateForRollback() {
    if (!this.gameContext) return

    this.previousState = {
      currentPlayerMoves: [...this.gameContext.state.currentPlayerMoves],
      isMyTurn: this.gameContext.state.isMyTurn
    }
    console.log('💾 Saved state for rollback:', this.previousState)
  }

  /**
   * Restore previous state if move fails
   */
  private rollbackOptimisticUpdate() {
    if (!this.gameContext || !this.previousState) {
      console.warn('⚠️ Cannot rollback: no previous state saved')
      return
    }

    console.log('🔄 Rolling back optimistic update to:', this.previousState)
    this.gameContext.setCurrentPlayerMoves(this.previousState.currentPlayerMoves)
    this.gameContext.setMyTurn(this.previousState.isMyTurn)
    this.previousState = null
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
    if (!this.gameContext) {
      console.error('❌ GameContext not available')
      return
    }

    switch (message.type) {
      case 'your_turn':
        this.handleYourTurn(message as YourTurnMessage)
        break
      case 'game_update':
        this.handleGameUpdate(message as GameUpdateMessage)
        break
      case 'available_plays':
        this.handleAvailableMoves(message)
        break
      case 'available_moves':
        this.handleAvailableMoves(message)
        break
      case 'game_state_update':
        this.handleGameStateUpdate(message)
        break
      case 'move_acknowledged':
        this.handleMoveAcknowledged(message)
        break
      case 'error':
        this.handleError(message)
        break
      default:
        console.warn('❓ Unhandled message type:', message.type)
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
      this.gameContext.setCurrentPlayerMoves(message.availableMoves)

      // Mark as player's turn
      this.gameContext.setMyTurn(true)

      console.log('Game has started, setting available moves:', message.availableMoves)
    } else {
      // Game not started yet, clear moves and turn state
      this.gameContext.setCurrentPlayerMoves([])
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

    // Update game state
    this.gameContext.setGameState(message.gameState)

    // Check if this update includes available plays (means it's our turn)
    if (message.gameState.availablePlays && Array.isArray(message.gameState.availablePlays) && message.gameState.availablePlays.length > 0) {
      console.log('📢 Game update includes available plays - setting as our turn')

      // Convert backend plays to our AvailableMove format
      const availableMoves = this.convertBackendPlaysToMoves(message.gameState.availablePlays)
      this.gameContext.setCurrentPlayerMoves(availableMoves)

      // Mark as our turn
      this.gameContext.setMyTurn(true)
    } else {
      console.log('📢 Game update has no available plays - not our turn')

      // Clear available moves (not our turn)
      this.gameContext.setCurrentPlayerMoves([])

      // Mark as not our turn
      this.gameContext.setMyTurn(false)
    }

    // TODO: Show animation of last move if provided
    if (message.lastMove) {
      console.log('Last move:', message.lastMove)
      // Could trigger animations here
    }
  }



  /**
   * Handle "available_moves" message - new clean format for available moves
   */
  private handleAvailableMoves(message: any) {
    if (!this.gameContext) {
      console.error('Game context not set')
      return
    }

    // If we receive available moves, it means it's our turn
    if (message.payload && Array.isArray(message.payload) && message.payload.length > 0) {
      this.gameContext.setMyTurn(true)
      const availableMoves = this.convertBackendPlaysToMoves(message.payload)
      this.gameContext.setCurrentPlayerMoves(availableMoves)
    } else {
      this.gameContext.setMyTurn(false)
      this.gameContext.setCurrentPlayerMoves([])
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

    console.log('🔄 GAME_STATE_UPDATE received:', message)
    console.log('🔄 Current game state before update:', this.gameContext.state.gameState)
    console.log('🔄 New game state payload:', message.payload)

    // Update game state
    if (message.payload) {
      this.gameContext.setGameState(message.payload)
      console.log('🔄 Game state updated successfully')

      // Check if this update includes available plays (means it's our turn)
      if (message.payload.availablePlays && Array.isArray(message.payload.availablePlays) && message.payload.availablePlays.length > 0) {
        console.log('📢 Game state update includes available plays - setting as our turn')

        // Convert backend plays to our AvailableMove format
        const availableMoves = this.convertBackendPlaysToMoves(message.payload.availablePlays)
        this.gameContext.setCurrentPlayerMoves(availableMoves)

        // Mark as our turn
        this.gameContext.setMyTurn(true)
      } else {
        // Not our turn - no available plays

        // Clear available moves (not our turn)
        this.gameContext.setCurrentPlayerMoves([])

        // Mark as not our turn
        this.gameContext.setMyTurn(false)
      }
    }

    // Game state updated
  }

  /**
   * Convert backend plays format to our AvailableMove format
   */
  private convertBackendPlaysToMoves(backendPlays: any[]): AvailableMove[] {
    // Convert backend plays to frontend moves
    console.log('🔄 Converting backend plays:', JSON.stringify(backendPlays.slice(0, 3), null, 2))

    if (!Array.isArray(backendPlays)) {
      console.warn('Backend plays is not an array:', backendPlays)
      return []
    }

    // Handle placing phase
    const placingMoves = backendPlays.filter(play => play.type === 'place_worker')
    if (placingMoves.length > 0) {
      const availableMove: AvailableMove = {
        type: 'place_worker',
        workerId: 1, // For placing phase, start with worker 1
        validPositions: placingMoves.map(play => ({
          x: play.position.x,
          y: play.position.y,
          serverMoveObject: play // Store complete server object
        }))
      }

      console.log('🔄 Converted placing moves:', availableMove)
      return [availableMove]
    }

    // Handle moving phase - group moves by worker
    const movingMoves = backendPlays.filter(play => play.type === 'move_worker')
    if (movingMoves.length > 0) {
      const movesByWorker = new Map<number, any[]>()

      // Group moves by workerId
      for (const move of movingMoves) {
        const workerId = move.workerId
        if (!movesByWorker.has(workerId)) {
          movesByWorker.set(workerId, [])
        }
        movesByWorker.get(workerId)!.push(move)
      }

      // Convert to AvailableMove format
      const availableMoves: AvailableMove[] = []
      for (const [workerId, moves] of movesByWorker) {
        availableMoves.push({
          type: 'move_worker',
          workerId: workerId as 1 | 2,
          validPositions: moves.map(move => ({
            x: move.position.x,
            y: move.position.y,
            serverMoveObject: move // Store complete server object
          }))
        })
      }

      console.log('🔄 Converted moving moves:', availableMoves)
      return availableMoves
    }

    // Handle building phase - group builds by worker
    const buildingMoves = backendPlays.filter(play => play.type === 'build_block' || play.type === 'build_dome')
    if (buildingMoves.length > 0) {
      const buildsByWorker = new Map<number, any[]>()

      // Group builds by workerId (if available) or assume current worker
      for (const build of buildingMoves) {
        const workerId = build.workerId || 1 // Fallback to worker 1
        if (!buildsByWorker.has(workerId)) {
          buildsByWorker.set(workerId, [])
        }
        buildsByWorker.get(workerId)!.push(build)
      }

      // Convert to AvailableMove format
      const availableMoves: AvailableMove[] = []
      for (const [workerId, builds] of buildsByWorker) {
        availableMoves.push({
          type: 'build_block',
          workerId: workerId as 1 | 2,
          validPositions: builds.map(build => ({
            x: build.position.x,
            y: build.position.y,
            buildingLevel: build.buildingLevel,
            buildingType: build.buildingType,
            moveType: build.type as 'build_block' | 'build_dome',
            // Store the complete server move object for direct use
            serverMoveObject: build
          }))
        })
      }

      console.log('🔄 Converted building moves:', availableMoves)
      console.log('🔄 First building move details:', JSON.stringify(availableMoves[0], null, 2))
      console.log('🔄 Raw backend building moves:', JSON.stringify(buildingMoves.slice(0, 2), null, 2))
      return availableMoves
    }

    console.warn('No valid moves found in backend plays:', backendPlays)
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
      // Move was successful - clear saved state (no rollback needed)
      this.previousState = null
    } else {
      console.error('❌ Move was rejected by backend:', message.payload)
      // Move was rejected - rollback optimistic update
      this.rollbackOptimisticUpdate()
      this.gameContext.setError('Move was rejected. Please try a different position.')
    }
  }

  /**
   * Handle "error" message - server sent an error
   */
  private handleError(message: any) {
    if (!this.gameContext) {
      console.error('Game context not set')
      return
    }

    console.error('🚨 Server error received:', message.payload)

    // Handle common game errors with consistent messaging
    if (typeof message.payload === 'string') {
      if (message.payload.includes('Not your turn')) {
        console.log('🚨 Not your turn error - expected behavior')
        this.rollbackOptimisticUpdate()
        // Don't show user error for expected behavior
        return
      }

      if (message.payload.includes('Invalid move')) {
        console.log('🚨 Invalid move error')
        this.rollbackOptimisticUpdate()
        this.gameContext.setError(ERROR_MESSAGES.VALIDATION.INVALID_MOVE)
        return
      }
    }

    // Generic error handling with consistent messaging
    const error = ErrorHandler.createError(
      ErrorType.GAME_LOGIC,
      typeof message.payload === 'string' ? message.payload : 'Unknown server error'
    )

    ErrorHandler.logError(error, 'GameplayService.handleError')
    this.rollbackOptimisticUpdate()
    this.gameContext.setError(ErrorHandler.getUserMessage(error))
  }

  /**
   * Submit a worker placement move with validation, optimistic updates and rollback
   */
  submitPlaceWorkerMove(workerId: 1 | 2, position: { x: number, y: number }) {
    if (!this.gameContext || !this.gameContext.state.gameId) {
      console.error('Cannot submit move: no game context or game ID')
      return
    }

    // Validate move on frontend first
    const validation = this.isValidMove(position.x, position.y)
    if (!validation.valid) {
      console.log('❌ Move validation failed on frontend - not sending to server')
      this.gameContext.setError('Invalid move. Please select a highlighted position.')
      return
    }

    console.log(`🎯 Submitting validated place worker move: Worker ${workerId} to (${position.x}, ${position.y})`)

    // Save current state for potential rollback
    this.saveStateForRollback()

    const move: PlaceWorkerMove = {
      type: 'place_worker',
      workerId,
      position
    }

    // Apply optimistic update
    this.gameContext.setCurrentPlayerMoves([])
    this.gameContext.setMyTurn(false)

    try {
      // Send via WebSocket
      webSocketService.send('make_move', {
        gameId: parseInt(this.gameContext.state.gameId!),
        move
      })

      // Set a timeout to rollback if no response received
      setTimeout(() => {
        if (this.previousState) {
          console.warn('⏰ Move timeout - rolling back optimistic update')
          this.rollbackOptimisticUpdate()
          this.gameContext.setError(ERROR_MESSAGES.NETWORK.REQUEST_TIMEOUT)
        }
      }, MOVE_TIMEOUT)

    } catch (error) {
      const gameError = ErrorHandler.createError(
        ErrorType.WEBSOCKET,
        error as Error,
        undefined,
        { gameId: this.gameContext.state.gameId, move }
      )

      ErrorHandler.logError(gameError, 'GameplayService.submitPlaceWorkerMove')
      this.rollbackOptimisticUpdate()
      this.gameContext.setError(ERROR_MESSAGES.WEBSOCKET.MESSAGE_FAILED)
    }
  }

  /**
   * Submit a worker movement move
   */
  submitMoveWorker(workerId: 1 | 2, toPosition: { x: number, y: number }, fromPosition: { x: number, y: number }) {
    if (!this.gameContext || !this.gameContext.state.gameId) {
      console.error('Cannot submit move: no game context or game ID')
      return
    }

    console.log(`🎯 Submitting worker movement: Worker ${workerId} from (${fromPosition.x}, ${fromPosition.y}) to (${toPosition.x}, ${toPosition.y})`)

    // Create the move object (match server's expected format)
    const move = {
      type: 'move_worker',
      workerId: workerId,
      fromPosition: fromPosition,
      position: toPosition
    }

    // Store previous state for potential rollback
    this.previousState = { ...this.gameContext.state.gameState }

    try {
      // Send via WebSocket
      const gameIdNumber = parseInt(this.gameContext.state.gameId!)
      console.log('🎯 About to send make_move via WebSocket:', {
        gameId: gameIdNumber,
        move,
        isConnected: webSocketService.isConnected()
      })

      webSocketService.send('make_move', {
        gameId: gameIdNumber,
        move
      })

      console.log('🎯 Successfully sent make_move via WebSocket')

      // Set a timeout to rollback if no response received
      setTimeout(() => {
        if (this.previousState) {
          console.warn('⏰ Move timeout - rolling back optimistic update')
          this.rollbackOptimisticUpdate()
          this.gameContext.setError(ERROR_MESSAGES.NETWORK.REQUEST_TIMEOUT)
        }
      }, MOVE_TIMEOUT)

    } catch (error) {
      const gameError = ErrorHandler.createError(
        ErrorType.WEBSOCKET,
        error as Error,
        undefined,
        { gameId: this.gameContext.state.gameId, move }
      )

      ErrorHandler.logError(gameError, 'GameplayService.submitMoveWorker')
      this.rollbackOptimisticUpdate()
      this.gameContext.setError(ERROR_MESSAGES.WEBSOCKET.MESSAGE_FAILED)
    }
  }

  /**
   * Submit a move using the exact server move object
   */
  submitServerMove(serverMoveObject: any) {
    if (!this.gameContext || !this.gameContext.state.gameId) {
      console.error('Cannot submit server move: no game context or game ID')
      return
    }

    console.log(`🎯 Submitting exact server move object:`, JSON.stringify(serverMoveObject, null, 2))
    console.log(`🎯 Move type:`, serverMoveObject.type)

    // Store previous state for potential rollback
    this.previousState = { ...this.gameContext.state.gameState }

    try {
      // Check WebSocket connection status
      const isConnected = webSocketService.isConnected()
      console.log(`🔌 WebSocket connection status: ${isConnected}`)

      if (!isConnected) {
        console.warn('⚠️ WebSocket not connected, attempting to reconnect...')
        // Could add reconnection logic here if needed
      }

      // Send the exact server move object via WebSocket
      const gameIdNumber = parseInt(this.gameContext.state.gameId!)
      console.log(`🎯 Sending WebSocket message with server move:`, {
        gameId: gameIdNumber,
        move: serverMoveObject
      })
      webSocketService.send('make_move', {
        gameId: gameIdNumber,
        move: serverMoveObject
      })

      // Fallback: refresh game state after a delay if WebSocket update doesn't arrive
      setTimeout(async () => {
        console.log('🔄 Fallback: Refreshing game state after move submission')
        try {
          await this.gameContext.refreshGameState()
        } catch (error) {
          console.error('Failed to refresh game state:', error)
        }
      }, 2000)

    } catch (error) {
      console.error('Failed to submit server move:', error)
      this.rollbackOptimisticUpdate()
    }
  }

  /**
   * Submit a building move (fallback method)
   */
  submitBuild(position: { x: number, y: number }, workerId?: number, fromWorkerPosition?: { x: number, y: number }) {
    if (!this.gameContext || !this.gameContext.state.gameId) {
      console.error('Cannot submit build: no game context or game ID')
      return
    }

    console.log(`🎯 Submitting build at (${position.x}, ${position.y})`)

    // Get current player ID for the move
    const currentPlayerId = this.gameContext.state.gameState?.currentPlayer
    if (!currentPlayerId) {
      console.error('Cannot submit build: no current player ID')
      return
    }

    // Create the move object with all required fields
    const move = {
      type: 'build_block',
      position: position,
      playerId: parseInt(currentPlayerId),
      ...(workerId && { workerId }),
      ...(fromWorkerPosition && { fromPosition: fromWorkerPosition })
    }

    console.log(`🎯 Created move object:`, move)

    // Store previous state for potential rollback
    this.previousState = { ...this.gameContext.state.gameState }

    try {
      // Send via WebSocket
      webSocketService.send('make_move', {
        gameId: parseInt(this.gameContext.state.gameId!),
        move
      })

      // Set a timeout to rollback if no response received
      setTimeout(() => {
        if (this.previousState) {
          console.warn('⏰ Build timeout - rolling back optimistic update')
          this.rollbackOptimisticUpdate()
          this.gameContext.setError(ERROR_MESSAGES.NETWORK.REQUEST_TIMEOUT)
        }
      }, MOVE_TIMEOUT)

    } catch (error) {
      const gameError = ErrorHandler.createError(
        ErrorType.WEBSOCKET,
        error as Error,
        undefined,
        { gameId: this.gameContext.state.gameId, move }
      )

      ErrorHandler.logError(gameError, 'GameplayService.submitBuild')
      this.rollbackOptimisticUpdate()
      this.gameContext.setError(ERROR_MESSAGES.WEBSOCKET.MESSAGE_FAILED)
    }
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

    const availableMoves: AvailableMove[] = this.gameContext.state.currentPlayerMoves

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

    const availableMoves: AvailableMove[] = this.gameContext.state.currentPlayerMoves
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
