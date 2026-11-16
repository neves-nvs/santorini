import ReactThreeTestRenderer from '@react-three/test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Board3D from '@/game/view/components/Board3D'
import { gridToWorldCoords } from '@/game/view/components/world-coords'
import { useGameStore } from '@/game/model/gameStore'
import { webSocketClient } from '@/game/services/WebSocketClient'
import type { BoardCell } from '@/game/model/gameStore'
import type { AvailableMove, GameState } from '@/game/model/game'

vi.mock('@/game/services/WebSocketClient', () => ({ webSocketClient: { request: vi.fn() } }))

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>
type SceneNode = Renderer['scene']

const ME = 1
const OPPONENT = 2
const GAME_ID = 7
const DEBUG_OFF = {
  showAxis: false,
  showGrid: false,
  showWireframe: false,
  showStats: false,
  showBoundingBoxes: false,
  useSampleBoard: false,
}

const emptyCells = (): BoardCell[][] =>
  Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ buildingLevel: 0, worker: null })))

const seed = ({
  cells = emptyCells(),
  moves = [] as AvailableMove[],
  selectedWorker = null as { workerId: number; x: number; y: number } | null,
}) =>
  useGameStore.setState({
    boardState: { cells, lastUpdated: 0 },
    currentPlayerMoves: moves,
    selectedWorker,
    gameId: String(GAME_ID),
    gameState: { currentPlayerId: ME } as GameState,
  })

const render = (onCellClick?: (x: number, y: number) => void, onMoveError?: (message: string) => void) =>
  ReactThreeTestRenderer.create(<Board3D debugState={DEBUG_OFF} onCellClick={onCellClick} onMoveError={onMoveError} />)

const isAt = (node: SceneNode, x: number, z: number) => {
  const [worldX, worldZ] = gridToWorldCoords(x, z)
  return node.props.position?.[0] === worldX && node.props.position?.[2] === worldZ
}

const stlMeshes = (r: Renderer) => r.scene.findAll((n) => n.type === 'Mesh' && Boolean(n.props.geometry))
const cellAt = (r: Renderer, x: number, z: number) =>
  r.scene.find((n) => n.type === 'Mesh' && n.props.position?.[1] === -0.01 && isAt(n, x, z))
const workerAt = (r: Renderer, x: number, z: number) =>
  r.scene.find((n) => n.type === 'Group' && n.props.onClick && !n.props.position && isAt(n.children[0], x, z))
const previews = (r: Renderer) => r.scene.findAll((n) => n.type === 'Group' && n.props.onClick && n.props.position)
const previewAt = (r: Renderer, x: number, z: number) => previews(r).find((n) => isAt(n, x, z))!
const isBuildingPreview = (preview: SceneNode) => preview.findAll((n) => Boolean(n.props.geometry)).length > 0

const click = async (r: Renderer, node: SceneNode) => r.fireEvent(node, 'click')
const sent = () => vi.mocked(webSocketClient.request)

const place = (...positions: Array<[number, number]>): AvailableMove => ({
  type: 'place_worker',
  workerId: 0,
  validPositions: positions.map(([x, y]) => ({ x, y })),
})
const move = (workerId: number, from: [number, number], ...to: Array<[number, number]>): AvailableMove => ({
  type: 'move_worker',
  workerId,
  fromPosition: { x: from[0], y: from[1] },
  validPositions: to.map(([x, y]) => ({ x, y })),
})
const build = (workerId: number, type: 'build_block' | 'build_dome', ...at: Array<[number, number]>): AvailableMove => ({
  type,
  workerId,
  validPositions: at.map(([x, y]) => ({ x, y })),
})

const withWorkers = (...workers: Array<{ x: number; y: number; playerId: number; workerId: number; level?: number }>) => {
  const cells = emptyCells()
  for (const { x, y, playerId, workerId, level = 0 } of workers) {
    cells[x][y] = { buildingLevel: level, worker: { playerId, workerId } }
  }
  return cells
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  sent().mockReset()
  sent().mockResolvedValue({})
  seed({})
})

describe('what the board draws', () => {
  it('draws one block per building level, a piece per worker, and the board base', async () => {
    const cells = withWorkers({ x: 0, y: 0, playerId: ME, workerId: 1 })
    cells[2][2].buildingLevel = 3
    cells[4][4].buildingLevel = 1
    seed({ cells })

    const renderer = await render()

    const board = 1
    const blocks = 3 + 1
    const workers = 1
    expect(stlMeshes(renderer)).toHaveLength(board + blocks + workers)
  })

  it('stacks a cell\'s blocks upward', async () => {
    const cells = emptyCells()
    cells[1][3].buildingLevel = 3
    seed({ cells })

    const renderer = await render()

    const heights = stlMeshes(renderer)
      .filter((mesh) => isAt(mesh, 1, 3))
      .map((mesh) => mesh.props.position[1])
    expect(heights).toHaveLength(3)
    expect(heights).toEqual([...heights].sort((a, b) => a - b))
    expect(new Set(heights).size).toBe(3)
  })

  it('draws an empty board when the game has not loaded', async () => {
    useGameStore.setState({ boardState: null })

    const renderer = await render()

    expect(stlMeshes(renderer)).toHaveLength(1)
  })
})

describe('placing workers', () => {
  it('shows a marker on every valid square and needs no worker selected', async () => {
    seed({ moves: [place([0, 0], [2, 3])] })

    const renderer = await render()

    expect(previews(renderer)).toHaveLength(2)
    expect(isBuildingPreview(previewAt(renderer, 0, 0))).toBe(false)
  })

  it('sends the move when a valid square is clicked, and clears the selection', async () => {
    seed({ moves: [place([0, 0], [2, 3])], selectedWorker: { workerId: 1, x: 0, y: 0 } })
    const renderer = await render()

    await click(renderer, cellAt(renderer, 2, 3))

    expect(sent()).toHaveBeenCalledWith('make_move', {
      gameId: GAME_ID,
      moveIndex: 0,
      move: { type: 'place_worker', workerId: 0, position: { x: 2, y: 3 } },
    })
    expect(useGameStore.getState().selectedWorker).toBeNull()
  })

  it('does the same when the marker is clicked instead of the cell', async () => {
    seed({ moves: [place([0, 0], [2, 3])] })
    const renderer = await render()

    await click(renderer, previewAt(renderer, 2, 3))

    expect(sent()).toHaveBeenCalledOnce()
    expect(sent().mock.calls[0][1]).toMatchObject({ move: { position: { x: 2, y: 3 } } })
  })

  it('ignores a click on a square that is not valid, but still tells the page', async () => {
    seed({ moves: [place([0, 0])] })
    const onCellClick = vi.fn()
    const renderer = await render(onCellClick)

    await click(renderer, cellAt(renderer, 4, 4))

    expect(sent()).not.toHaveBeenCalled()
    expect(onCellClick).toHaveBeenCalledWith(4, 4)
  })

  it('reports the server\'s answer when the move is refused', async () => {
    sent().mockRejectedValue(new Error('Not your turn'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    seed({ moves: [place([0, 0])] })
    const onMoveError = vi.fn()
    const renderer = await render(undefined, onMoveError)

    await click(renderer, cellAt(renderer, 0, 0))

    await vi.waitFor(() => expect(onMoveError).toHaveBeenCalledWith('Not your turn'))
  })

  it('sends nothing without a game id', async () => {
    seed({ moves: [place([0, 0])] })
    useGameStore.setState({ gameId: null })
    const renderer = await render()

    await click(renderer, cellAt(renderer, 0, 0))

    expect(sent()).not.toHaveBeenCalled()
  })
})

describe('selecting a worker', () => {
  const mine = { x: 0, y: 0, playerId: ME, workerId: 10 }
  // worker ids repeat across players, so the opponent's worker has the same id as mine
  const theirs = { x: 4, y: 4, playerId: OPPONENT, workerId: 10 }

  it('selects my worker when it has moves, and deselects on a second click', async () => {
    seed({ cells: withWorkers(mine, theirs), moves: [move(10, [0, 0], [0, 1])] })
    const renderer = await render()

    await click(renderer, workerAt(renderer, 0, 0))
    expect(useGameStore.getState().selectedWorker).toEqual({ workerId: 10, x: 0, y: 0 })

    await click(renderer, workerAt(renderer, 0, 0))
    expect(useGameStore.getState().selectedWorker).toBeNull()
  })

  it('never selects the opponent\'s worker', async () => {
    seed({ cells: withWorkers(mine, theirs), moves: [move(10, [0, 0], [0, 1])] })
    const renderer = await render()

    await click(renderer, workerAt(renderer, 4, 4))

    expect(useGameStore.getState().selectedWorker).toBeNull()
  })

  it('does not select a worker that has no moves', async () => {
    seed({ cells: withWorkers(mine, { ...theirs, playerId: ME, workerId: 11 }), moves: [move(10, [0, 0], [0, 1])] })
    const renderer = await render()

    await click(renderer, workerAt(renderer, 4, 4))

    expect(useGameStore.getState().selectedWorker).toBeNull()
  })

  it('shows move markers only for the selected worker', async () => {
    const other = { x: 2, y: 2, playerId: ME, workerId: 11 }
    seed({
      cells: withWorkers(mine, other),
      moves: [move(10, [0, 0], [0, 1], [1, 1]), move(11, [2, 2], [3, 3])],
    })
    const renderer = await render()
    expect(previews(renderer)).toHaveLength(0)

    await click(renderer, workerAt(renderer, 0, 0))

    expect(previews(renderer)).toHaveLength(2)
    expect(previews(renderer).some((p) => isAt(p, 3, 3))).toBe(false)
  })
})

describe('moving and building', () => {
  const mine = { x: 0, y: 0, playerId: ME, workerId: 10 }
  const selected = { workerId: 10, x: 0, y: 0 }

  it('ignores a move click until a worker is selected', async () => {
    seed({ cells: withWorkers(mine), moves: [move(10, [0, 0], [0, 1])] })
    const renderer = await render()

    await click(renderer, cellAt(renderer, 0, 1))

    expect(sent()).not.toHaveBeenCalled()
  })

  it('sends where the worker moves from and to, and keeps the worker selected for the build', async () => {
    seed({ cells: withWorkers(mine), moves: [move(10, [0, 0], [0, 1])], selectedWorker: selected })
    const renderer = await render()

    await click(renderer, cellAt(renderer, 0, 1))

    expect(sent()).toHaveBeenCalledWith('make_move', {
      gameId: GAME_ID,
      moveIndex: 0,
      move: { type: 'move_worker', workerId: 10, position: { x: 0, y: 1 }, fromPosition: { x: 0, y: 0 } },
    })
    expect(useGameStore.getState().selectedWorker).toEqual(selected)
  })

  it('sends the index of the matching move, and clears the selection after a build', async () => {
    seed({
      cells: withWorkers(mine),
      moves: [move(10, [0, 0], [1, 1]), build(10, 'build_block', [1, 0])],
      selectedWorker: selected,
    })
    const renderer = await render()

    await click(renderer, cellAt(renderer, 1, 0))

    expect(sent().mock.calls[0][1]).toMatchObject({ moveIndex: 1, move: { type: 'build_block', position: { x: 1, y: 0 } } })
    expect(useGameStore.getState().selectedWorker).toBeNull()
  })

  it('shows a building preview, not a move marker, for build moves', async () => {
    const cells = withWorkers(mine)
    cells[1][0].buildingLevel = 1
    cells[1][1].buildingLevel = 3
    seed({
      cells,
      moves: [build(10, 'build_block', [1, 0]), build(10, 'build_dome', [1, 1])],
      selectedWorker: selected,
    })

    const renderer = await render()

    expect(isBuildingPreview(previewAt(renderer, 1, 0))).toBe(true)
    expect(isBuildingPreview(previewAt(renderer, 1, 1))).toBe(true)
  })

  it('lifts markers above the buildings they sit on', async () => {
    const cells = withWorkers(mine)
    cells[1][0].buildingLevel = 2
    seed({ cells, moves: [move(10, [0, 0], [1, 0], [0, 1])], selectedWorker: selected })

    const renderer = await render()

    expect(previewAt(renderer, 1, 0).props.position[1]).toBeGreaterThan(previewAt(renderer, 0, 1).props.position[1])
  })
})
