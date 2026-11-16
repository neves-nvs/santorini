import { describe, it, expect } from 'vitest'
import { gridToWorldCoords, worldToGridCoords } from '@/game/view/components/world-coords'

describe('gridToWorldCoords', () => {
  it('should convert grid (0,0) to world (-2,-2)', () => {
    const [worldX, worldZ] = gridToWorldCoords(0, 0)

    expect(worldX).toBe(-2)
    expect(worldZ).toBe(-2)
  })

  it('should convert grid (2,2) to world (0,0)', () => {
    const [worldX, worldZ] = gridToWorldCoords(2, 2)

    expect(worldX).toBe(0)
    expect(worldZ).toBe(0)
  })

  it('should convert grid (4,4) to world (2,2)', () => {
    const [worldX, worldZ] = gridToWorldCoords(4, 4)

    expect(worldX).toBe(2)
    expect(worldZ).toBe(2)
  })

  it('should convert grid (1,3) to world (-1,1)', () => {
    const [worldX, worldZ] = gridToWorldCoords(1, 3)

    expect(worldX).toBe(-1)
    expect(worldZ).toBe(1)
  })

  it('should handle all grid positions correctly', () => {
    for (let gridX = 0; gridX < 5; gridX++) {
      for (let gridZ = 0; gridZ < 5; gridZ++) {
        const [worldX, worldZ] = gridToWorldCoords(gridX, gridZ)
        
        expect(worldX).toBe(gridX - 2)
        expect(worldZ).toBe(gridZ - 2)
      }
    }
  })
})

describe('worldToGridCoords', () => {
  it('should convert world (-2,-2) to grid (0,0)', () => {
    const [gridX, gridZ] = worldToGridCoords(-2, -2)

    expect(gridX).toBe(0)
    expect(gridZ).toBe(0)
  })

  it('should convert world (0,0) to grid (2,2)', () => {
    const [gridX, gridZ] = worldToGridCoords(0, 0)

    expect(gridX).toBe(2)
    expect(gridZ).toBe(2)
  })

  it('should convert world (2,2) to grid (4,4)', () => {
    const [gridX, gridZ] = worldToGridCoords(2, 2)

    expect(gridX).toBe(4)
    expect(gridZ).toBe(4)
  })

  it('should convert world (-1,1) to grid (1,3)', () => {
    const [gridX, gridZ] = worldToGridCoords(-1, 1)

    expect(gridX).toBe(1)
    expect(gridZ).toBe(3)
  })

  it('should handle all world positions correctly', () => {
    for (let worldX = -2; worldX <= 2; worldX++) {
      for (let worldZ = -2; worldZ <= 2; worldZ++) {
        const [gridX, gridZ] = worldToGridCoords(worldX, worldZ)
        
        expect(gridX).toBe(worldX + 2)
        expect(gridZ).toBe(worldZ + 2)
      }
    }
  })
})

describe('coordinate conversion round-trip', () => {
  it('should convert grid -> world -> grid correctly', () => {
    for (let gridX = 0; gridX < 5; gridX++) {
      for (let gridZ = 0; gridZ < 5; gridZ++) {
        const [worldX, worldZ] = gridToWorldCoords(gridX, gridZ)
        const [backToGridX, backToGridZ] = worldToGridCoords(worldX, worldZ)
        
        expect(backToGridX).toBe(gridX)
        expect(backToGridZ).toBe(gridZ)
      }
    }
  })

  it('should convert world -> grid -> world correctly', () => {
    for (let worldX = -2; worldX <= 2; worldX++) {
      for (let worldZ = -2; worldZ <= 2; worldZ++) {
        const [gridX, gridZ] = worldToGridCoords(worldX, worldZ)
        const [backToWorldX, backToWorldZ] = gridToWorldCoords(gridX, gridZ)
        
        expect(backToWorldX).toBe(worldX)
        expect(backToWorldZ).toBe(worldZ)
      }
    }
  })
})

