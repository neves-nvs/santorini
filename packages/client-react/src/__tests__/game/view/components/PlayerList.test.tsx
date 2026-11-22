import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import PlayerList from '@/game/view/components/PlayerList'
import { useGameStore } from '@/game/model/gameStore'
import type { GamePlayerView, GameState } from '@/game/model/game'

const player = (userId: number): GamePlayerView => ({
  userId,
  username: `player-${userId}`,
  isReady: false,
  isConnected: false,
})

const showGame = (players: GamePlayerView[], totalPlayers = 2) =>
  useGameStore.setState({ gameState: { players, totalPlayers, currentSeat: null } as GameState })

describe('PlayerList', () => {
  beforeEach(() => {
    useGameStore.setState({ gameState: null })
  })

  it('shows a banner for each player and an empty slot for each free seat', () => {
    showGame([player(10)], 3)

    render(<PlayerList />)

    expect(screen.getByText('P1')).toBeTruthy()
    expect(screen.getByText('player-10')).toBeTruthy()
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
