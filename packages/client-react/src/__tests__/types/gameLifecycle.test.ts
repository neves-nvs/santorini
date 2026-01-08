import { describe, it, expect } from 'vitest'
import {
  mapToGameLifecycle,
  getGameStatusMessage,
  getUIComponents,
} from '../../types/gameLifecycle'

describe('mapToGameLifecycle', () => {
  describe('FINISHED state', () => {
    it('should map completed game to FINISHED/VICTORY', () => {
      const backendState = {
        game_status: 'completed',
        winner_id: 1,
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('FINISHED')
      expect(lifecycle.sub).toBe('VICTORY')
    })

    it('should map aborted game to FINISHED/ABORTED', () => {
      const backendState = {
        game_status: 'aborted',
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('FINISHED')
      expect(lifecycle.sub).toBe('ABORTED')
    })

    it('should map game with winner to FINISHED/VICTORY', () => {
      const backendState = {
        game_status: 'in-progress',
        winner_id: 2,
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('FINISHED')
      expect(lifecycle.sub).toBe('VICTORY')
    })
  })

  describe('IN_PROGRESS state', () => {
    it('should map placing phase to IN_PROGRESS/PLACING', () => {
      const backendState = {
        game_status: 'in-progress',
        game_phase: 'placing',
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('IN_PROGRESS')
      expect(lifecycle.sub).toBe('PLACING')
    })

    it('should map moving phase to IN_PROGRESS/MOVING', () => {
      const backendState = {
        game_status: 'in-progress',
        game_phase: 'moving',
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('IN_PROGRESS')
      expect(lifecycle.sub).toBe('MOVING')
    })

    it('should map building phase to IN_PROGRESS/BUILDING', () => {
      const backendState = {
        game_status: 'in-progress',
        game_phase: 'building',
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('IN_PROGRESS')
      expect(lifecycle.sub).toBe('BUILDING')
    })

    it('should default to PLACING if phase is unknown', () => {
      const backendState = {
        game_status: 'in-progress',
        game_phase: 'unknown',
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('IN_PROGRESS')
      expect(lifecycle.sub).toBe('PLACING')
    })
  })

  describe('WAITING state', () => {
    it('should map to WAITING/JOINING when not all players joined', () => {
      const backendState = {
        game_status: 'waiting',
        players: [{ id: 1 }],
        player_count: 2,
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('WAITING')
      expect(lifecycle.sub).toBe('JOINING')
    })

    it('should map to WAITING/READY_CHECK when all players joined', () => {
      const backendState = {
        game_status: 'ready',
        players: [{ id: 1 }, { id: 2 }],
        player_count: 2,
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('WAITING')
      expect(lifecycle.sub).toBe('READY_CHECK')
    })

    it('should handle empty players array', () => {
      const backendState = {
        game_status: 'waiting',
        players: [],
        player_count: 2,
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('WAITING')
      expect(lifecycle.sub).toBe('JOINING')
    })

    it('should default to 2 players if player_count missing', () => {
      const backendState = {
        game_status: 'waiting',
        players: [{ id: 1 }, { id: 2 }],
      }

      const lifecycle = mapToGameLifecycle(backendState)

      expect(lifecycle.main).toBe('WAITING')
      expect(lifecycle.sub).toBe('READY_CHECK')
    })
  })
})

describe('getGameStatusMessage', () => {
  describe('WAITING state messages', () => {
    it('should show joining message', () => {
      const lifecycle = { main: 'WAITING' as const, sub: 'JOINING' as const }
      const message = getGameStatusMessage(lifecycle, false, 1, 2, 0)

      expect(message).toBe('⏳ Waiting for players (1/2 joined)')
    })

    it('should show ready check message', () => {
      const lifecycle = { main: 'WAITING' as const, sub: 'READY_CHECK' as const }
      const message = getGameStatusMessage(lifecycle, false, 2, 2, 1)

      expect(message).toBe('⏳ Waiting for players (1/2 ready)')
    })
  })

  describe('IN_PROGRESS state messages', () => {
    it('should show placing message for current player', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: 'PLACING' as const }
      const message = getGameStatusMessage(lifecycle, true, 2, 2, 0)

      expect(message).toBe('🎯 Your turn - Place worker')
    })

    it('should show placing message for opponent', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: 'PLACING' as const }
      const message = getGameStatusMessage(lifecycle, false, 2, 2, 0)

      expect(message).toBe('⏳ Opponent placing worker')
    })

    it('should show moving message for current player', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: 'MOVING' as const }
      const message = getGameStatusMessage(lifecycle, true, 2, 2, 0)

      expect(message).toBe('🎯 Your turn - Move worker')
    })

    it('should show moving message for opponent', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: 'MOVING' as const }
      const message = getGameStatusMessage(lifecycle, false, 2, 2, 0)

      expect(message).toBe('⏳ Opponent moving')
    })

    it('should show building message for current player', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: 'BUILDING' as const }
      const message = getGameStatusMessage(lifecycle, true, 2, 2, 0)

      expect(message).toBe('🎯 Your turn - Build block')
    })

    it('should show building message for opponent', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: 'BUILDING' as const }
      const message = getGameStatusMessage(lifecycle, false, 2, 2, 0)

      expect(message).toBe('⏳ Opponent building')
    })

    it('should show generic message for unknown phase', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: null }
      const message = getGameStatusMessage(lifecycle, true, 2, 2, 0)

      expect(message).toBe('🎯 Your turn')
    })
  })

  describe('FINISHED state messages', () => {
    it('should show aborted message', () => {
      const lifecycle = { main: 'FINISHED' as const, sub: 'ABORTED' as const }
      const message = getGameStatusMessage(lifecycle, false, 2, 2, 0)

      expect(message).toBe('❌ Game was aborted')
    })

    it('should show victory message', () => {
      const lifecycle = { main: 'FINISHED' as const, sub: 'VICTORY' as const }
      const message = getGameStatusMessage(lifecycle, false, 2, 2, 0)

      expect(message).toBe('🏆 Game finished')
    })
  })

  it('should show unknown message for invalid state', () => {
    const lifecycle = { main: 'INVALID' as any, sub: null }
    const message = getGameStatusMessage(lifecycle, false, 2, 2, 0)

    expect(message).toBe('🎮 Game status unknown')
  })
})

describe('getUIComponents', () => {
  describe('WAITING state UI', () => {
    it('should show lobby controls and join button', () => {
      const lifecycle = { main: 'WAITING' as const, sub: 'JOINING' as const }
      const ui = getUIComponents(lifecycle)

      expect(ui.showLobbyControls).toBe(true)
      expect(ui.showJoinButton).toBe(true)
      expect(ui.showReadyButton).toBe(false)
      expect(ui.showGameBoard).toBe(false)
      expect(ui.showGameResults).toBe(false)
    })

    it('should show lobby controls and ready button', () => {
      const lifecycle = { main: 'WAITING' as const, sub: 'READY_CHECK' as const }
      const ui = getUIComponents(lifecycle)

      expect(ui.showLobbyControls).toBe(true)
      expect(ui.showJoinButton).toBe(false)
      expect(ui.showReadyButton).toBe(true)
      expect(ui.showGameBoard).toBe(false)
    })
  })

  describe('IN_PROGRESS state UI', () => {
    it('should show game board and controls', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: 'MOVING' as const }
      const ui = getUIComponents(lifecycle)

      expect(ui.showGameBoard).toBe(true)
      expect(ui.showGameControls).toBe(true)
      expect(ui.showLobbyControls).toBe(false)
      expect(ui.showGameResults).toBe(false)
    })

    it('should show worker placement controls', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: 'PLACING' as const }
      const ui = getUIComponents(lifecycle)

      expect(ui.showWorkerPlacement).toBe(true)
      expect(ui.showMovementControls).toBe(false)
      expect(ui.showBuildingControls).toBe(false)
    })

    it('should show movement controls', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: 'MOVING' as const }
      const ui = getUIComponents(lifecycle)

      expect(ui.showWorkerPlacement).toBe(false)
      expect(ui.showMovementControls).toBe(true)
      expect(ui.showBuildingControls).toBe(false)
    })

    it('should show building controls', () => {
      const lifecycle = { main: 'IN_PROGRESS' as const, sub: 'BUILDING' as const }
      const ui = getUIComponents(lifecycle)

      expect(ui.showWorkerPlacement).toBe(false)
      expect(ui.showMovementControls).toBe(false)
      expect(ui.showBuildingControls).toBe(true)
    })
  })

  describe('FINISHED state UI', () => {
    it('should show game results and play again button', () => {
      const lifecycle = { main: 'FINISHED' as const, sub: 'VICTORY' as const }
      const ui = getUIComponents(lifecycle)

      expect(ui.showGameResults).toBe(true)
      expect(ui.showPlayAgainButton).toBe(true)
      expect(ui.showGameBoard).toBe(false)
      expect(ui.showLobbyControls).toBe(false)
    })
  })
})

