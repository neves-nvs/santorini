/**
 * Clean Game State Architecture
 * 
 * The game has 3 main lifecycle states that determine the overall UI:
 * - WAITING: Game hasn't started yet (joining players, ready checks)
 * - IN_PROGRESS: Game is actively being played
 * - FINISHED: Game has ended
 * 
 * Each main state has sub-states that only matter within that context.
 */

// Main game lifecycle states (determines overall UI structure)
export type GameLifecycleState = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'

// Sub-states for WAITING phase
export type WaitingSubState = 'JOINING' | 'READY_CHECK'

// Sub-states for IN_PROGRESS phase  
export type GameplaySubState = 'PLACING' | 'MOVING' | 'BUILDING'

// Sub-states for FINISHED phase
export type FinishedSubState = 'VICTORY' | 'ABORTED'

// Combined game state
export interface GameLifecycle {
  main: GameLifecycleState
  sub: WaitingSubState | GameplaySubState | FinishedSubState | null
}

/**
 * Convert backend game state to clean lifecycle state
 * Supports both old format (game_status) and new format (status)
 */
export function mapToGameLifecycle(backendState: any): GameLifecycle {
  // Support both old and new API formats
  const gameStatus = backendState.status || backendState.game_status
  const gamePhase = backendState.phase || backendState.game_phase
  const players = backendState.players || []
  const playerCount = backendState.maxPlayers || backendState.player_count || 2

  // FINISHED state
  if (gameStatus === 'completed' || backendState.winnerId || backendState.winner_id) {
    return {
      main: 'FINISHED',
      sub: 'VICTORY'
    }
  }

  // IN_PROGRESS state
  if (gameStatus === 'in-progress') {
    let sub: GameplaySubState = 'PLACING' // default

    if (gamePhase === 'placing') sub = 'PLACING'
    else if (gamePhase === 'moving') sub = 'MOVING'
    else if (gamePhase === 'building') sub = 'BUILDING'

    return {
      main: 'IN_PROGRESS',
      sub
    }
  }

  // WAITING state (default)
  const hasAllPlayers = players.length >= playerCount
  const sub: WaitingSubState = hasAllPlayers ? 'READY_CHECK' : 'JOINING'

  return {
    main: 'WAITING',
    sub
  }
}

/**
 * Get user-friendly status message based on lifecycle state
 */
export function getGameStatusMessage(
  lifecycle: GameLifecycle, 
  isMyTurn: boolean,
  currentPlayers: number,
  totalPlayers: number,
  readyCount: number
): string {
  switch (lifecycle.main) {
    case 'WAITING':
      if (lifecycle.sub === 'JOINING') {
        return `⏳ Waiting for players (${currentPlayers}/${totalPlayers} joined)`
      } else {
        return `⏳ Waiting for players (${readyCount}/${currentPlayers} ready)`
      }

    case 'IN_PROGRESS':
      switch (lifecycle.sub) {
        case 'PLACING':
          return isMyTurn ? `🎯 Your turn - Place worker` : `⏳ Opponent placing worker`
        case 'MOVING':
          return isMyTurn ? `🎯 Your turn - Move worker` : `⏳ Opponent moving`
        case 'BUILDING':
          return isMyTurn ? `🎯 Your turn - Build block` : `⏳ Opponent building`
        default:
          return isMyTurn ? `🎯 Your turn` : `⏳ Opponent's turn`
      }

    case 'FINISHED':
      if (lifecycle.sub === 'ABORTED') {
        return `❌ Game was aborted`
      } else {
        return `🏆 Game finished`
      }

    default:
      return `🎮 Game status unknown`
  }
}

/**
 * Determine what UI components should be shown
 */
export function getUIComponents(lifecycle: GameLifecycle) {
  return {
    // Main UI sections
    showLobbyControls: lifecycle.main === 'WAITING',
    showGameBoard: lifecycle.main === 'IN_PROGRESS',
    showGameResults: lifecycle.main === 'FINISHED',
    
    // Specific controls within each section
    showJoinButton: lifecycle.main === 'WAITING' && lifecycle.sub === 'JOINING',
    showReadyButton: lifecycle.main === 'WAITING' && lifecycle.sub === 'READY_CHECK',
    showGameControls: lifecycle.main === 'IN_PROGRESS',
    showPlayAgainButton: lifecycle.main === 'FINISHED',
    
    // Game mechanics (only relevant during gameplay)
    showWorkerPlacement: lifecycle.main === 'IN_PROGRESS' && lifecycle.sub === 'PLACING',
    showMovementControls: lifecycle.main === 'IN_PROGRESS' && lifecycle.sub === 'MOVING',
    showBuildingControls: lifecycle.main === 'IN_PROGRESS' && lifecycle.sub === 'BUILDING',
  }
}
