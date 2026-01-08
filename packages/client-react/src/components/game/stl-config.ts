// STL Import Configuration - Exact values from original client/src/view/STLLoader.ts

export const locations = {
  builder: "/assets/Builder.stl",
  base: "/assets/Base.stl",
  mid: "/assets/Mid.stl",
  top: "/assets/Top.stl",
  dome: "/assets/Dome.stl",
  board: "/assets/Board.stl",
}

export const configs = {
  builder: { file: locations.builder, y_offset: 0.10, x_rotation: -Math.PI / 2, scale: 0.025 },
  base: { file: locations.base, y_offset: 0.281, x_rotation: -Math.PI / 2, scale: 0.028 },
  mid: { file: locations.mid, y_offset: 0.31, x_rotation: -Math.PI / 2, scale: 0.028 },
  top: { file: locations.top, y_offset: 0.20, x_rotation: Math.PI / 2, scale: 0.030 },
  dome: { file: locations.dome, y_offset: 0.15, x_rotation: -Math.PI / 2, scale: 0.0165 },
  board: { file: locations.board, y_offset: -0.067, x_rotation: -Math.PI / 2, scale: 0.031747 },
}

export type PieceType = 'base' | 'mid' | 'top' | 'dome' | 'builder' | 'board'

export interface PieceConfig {
  file: string
  y_offset: number
  x_rotation: number
  scale: number
}
