import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import PlayerList from '@/game/view/components/PlayerList'
import GameStatusBar from '@/game/view/components/GameStatusBar'
import { applyGameView, resetMessageHandlerState } from '@/game/update/GameMessageHandler'
import type { WaitingGameView } from '@santorini/shared'
import { useGameStore } from '@/game/model/gameStore'
import type { GameState, PlayerView } from '@/game/model/game'

const player = (userId: number): PlayerView => ({ userId, isReady: false })

const showGame = (players: PlayerView[], totalPlayers = 2) =>
  useGameStore.setState({ gameState: { players, totalPlayers, currentSeat: null } as GameState })

describe('PlayerList', () => {
  it('shows readiness from game_state updates in the player list and phase label', () => {
    resetMessageHandlerState()
    const view: WaitingGameView = {
      gameId: 7, version: 1, status: 'waiting', phase: null, currentSeat: null,
      turnNumber: 0, maxPlayers: 2, board: { cells: [] },
      players: [player(10), player(11)], winnerUserId: null, winReason: null,
      viewer: { role: 'spectator' },
    }
    applyGameView(view)
    render(<><PlayerList /><GameStatusBar /></>)
    expect(screen.getAllByText('Not ready')).toHaveLength(2)
    act(() => applyGameView({ ...view, version: 2, players: [{ ...player(10), isReady: true }, player(11)] }))
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('Waiting for players (1/2 ready)')).toBeInTheDocument()
    act(() => applyGameView({ ...view, version: 3 }))
    expect(screen.queryByText('Ready')).toBeNull()
    expect(screen.getByText('Waiting for players (0/2 ready)')).toBeInTheDocument()
  })
  beforeEach(() => {
    useGameStore.setState({ gameState: null })
  })

  it('shows a banner for each player and an empty slot for each free seat', () => {
    showGame([player(10)], 3)

    render(<PlayerList />)

    expect(screen.getByText('P1')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Seat occupied' })).toBeInTheDocument()
    expect(screen.getAllByText('Waiting for a player')).toHaveLength(2)
    expect(screen.getByText('Players (1/3)')).toBeTruthy()
  })

  it('shows every seat as empty in a game nobody has joined', () => {
    showGame([], 2)

    render(<PlayerList />)

    expect(screen.getAllByText('Waiting for a player')).toHaveLength(2)
  })

  it('has no empty slot once every seat is taken', () => {
    showGame([player(10), player(11)])

    render(<PlayerList />)

    expect(screen.getByText('P1')).toBeTruthy()
    expect(screen.getByText('P2')).toBeTruthy()
    expect(screen.queryByText('Waiting for a player')).toBeNull()
  })

  it('replaces the empty slot with the banner when the player joins', () => {
    showGame([player(10)])
    render(<PlayerList />)
    expect(screen.queryByText('P2')).toBeNull()

    act(() => showGame([player(10), player(11)]))

    expect(screen.getByText('P2')).toBeTruthy()
    expect(screen.queryByText('Waiting for a player')).toBeNull()
  })

  it('says it is loading before there is a game', () => {
    render(<PlayerList />)

    expect(screen.getByText('Loading players...')).toBeTruthy()
  })
})
