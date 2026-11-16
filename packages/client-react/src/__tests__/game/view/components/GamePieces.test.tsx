import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { BoundingBox, Cell, Worker } from '@/game/view/components/GamePieces'
import { PLAYER_COLORS } from '@/game/model/gameConstants'

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>

const materialColors = (renderer: Renderer) =>
  renderer.scene.findAll((node) => node.type.endsWith('Material')).map((material) => material.props.color)

describe('Cell', () => {
  it('alternates its colour like a checkerboard', async () => {
    const colorAt = async (x: number, z: number) => {
      const renderer = await ReactThreeTestRenderer.create(<Cell position={[0, 0, 0]} gridX={x} gridZ={z} onClick={vi.fn()} />)
      return materialColors(renderer)[0]
    }

    expect(await colorAt(0, 0)).toBe(await colorAt(1, 1))
    expect(await colorAt(0, 1)).toBe(await colorAt(1, 0))
    expect(await colorAt(0, 0)).not.toBe(await colorAt(0, 1))
  })
})

describe('Worker', () => {
  const render = (props: Partial<Parameters<typeof Worker>[0]>) =>
    ReactThreeTestRenderer.create(<Worker playerId={1} position={[0, 0, 0]} {...props} />)

  it('only reports clicks when it can move', async () => {
    const onClick = vi.fn()

    const blocked = await render({ canMove: false, onClick })
    await blocked.fireEvent(blocked.scene.children[0], 'click')
    expect(onClick).not.toHaveBeenCalled()

    const movable = await render({ canMove: true, onClick })
    await movable.fireEvent(movable.scene.children[0], 'click')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is drawn in its player\'s colour', async () => {
    const first = await render({ playerId: 1 })
    const second = await render({ playerId: 2 })

    expect(materialColors(first)).toContain(PLAYER_COLORS[0])
    expect(materialColors(second)).toContain(PLAYER_COLORS[1])
  })

  it('shows a ring only when it can move, and highlights it when selected', async () => {
    const idle = await render({ canMove: false })
    const movable = await render({ canMove: true })
    const selected = await render({ canMove: true, isSelected: true })

    expect(materialColors(idle)).not.toContain('#00ff00')
    expect(materialColors(movable)).toContain('#00ff00')
    expect(materialColors(selected)).toContain('#ffff00')
    expect(materialColors(selected)).not.toContain('#00ff00')
  })
})

describe('BoundingBox', () => {
  const boxes = async (blockLevel: number, visible = true) => {
    const renderer = await ReactThreeTestRenderer.create(<BoundingBox position={[0, 0, 0]} blockLevel={blockLevel} visible={visible} />)
    return renderer.scene.children[0]?.children ?? []
  }

  it('draws nothing when hidden', async () => {
    expect(await boxes(2, false)).toHaveLength(0)
  })

  it('draws one box per building level', async () => {
    expect(await boxes(1)).toHaveLength(1)
    expect(await boxes(3)).toHaveLength(3)
  })
})
