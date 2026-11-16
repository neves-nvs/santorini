// Convert grid coordinates (0-4) to centered coordinates (-2 to +2)
export const gridToWorldCoords = (gridX: number, gridZ: number): [number, number] => {
  return [gridX - 2, gridZ - 2]
}

// Convert world coordinates (-2 to +2) to grid coordinates (0-4)
export const worldToGridCoords = (worldX: number, worldZ: number): [number, number] => {
  return [worldX + 2, worldZ + 2]
}
