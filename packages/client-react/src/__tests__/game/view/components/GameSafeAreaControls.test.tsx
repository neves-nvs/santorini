import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GameLobby from '@/game/view/components/GameLobby'

vi.mock('@/game/view/hooks/useGameLifecycle', () => ({
  useGameLifecycle: () => ({ ui: { showLobbyControls: true, showReadyButton: false }, gameInfo: { currentPlayers: 0, totalPlayers: 2 } }),
}))
vi.mock('@/game/view/hooks/useReadyState', () => ({
  useReadyState: () => ({ handleReadyToggle: vi.fn(), readyButtonText: 'Ready', isDisabled: false }),
}))
vi.mock('@/game/view/components/PlayerList', () => ({ default: () => <div>Player list</div> }))

describe('game controls in safe areas', () => {
  afterEach(() => {
    window.innerWidth = 1024
    window.innerHeight = 768
  })

  it.each([
    { width: 844, height: 390, orientation: 'landscape' },
    { width: 390, height: 844, orientation: 'portrait' },
  ])('keeps lobby offsets safe in $orientation', ({ width, height }) => {
    window.innerWidth = width
    window.innerHeight = height
    render(<GameLobby />)

    const lobby = screen.getByRole('region', { name: 'Game lobby' })
    expect(lobby.style.bottom).toContain('safe-area-inset-bottom')
    expect(lobby.style.right).toContain('safe-area-inset-right')
  })
})
