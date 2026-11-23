import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GameNavigation from '@/game/view/components/GameNavigation'
import GameLobby from '@/game/view/components/GameLobby'

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))
vi.mock('@/user/model/appStore', () => ({ useAppStore: (selector: (state: { username: string }) => unknown) => selector({ username: 'Player' }) }))
vi.mock('@/game/model/gameSelectors', () => ({ useIsConnected: () => true, useGameId: () => '123' }))
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
  ])('keeps navigation and lobby offsets safe in $orientation', ({ width, height }) => {
    window.innerWidth = width
    window.innerHeight = height
    render(<><GameNavigation /><GameLobby /></>)

    const navigation = screen.getByRole('navigation', { name: 'Game' })
    const lobby = screen.getByRole('region', { name: 'Game lobby' })
    expect(navigation.style.top).toContain('safe-area-inset-top')
    expect(navigation.style.left).toContain('safe-area-inset-left')
    expect(lobby.style.bottom).toContain('safe-area-inset-bottom')
    expect(lobby.style.right).toContain('safe-area-inset-right')
  })
})
