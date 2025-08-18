// Game Constants - Centralized configuration values
// This eliminates magic numbers throughout the codebase

// Board Configuration
export const BOARD_SIZE = 5
export const CELL_SIZE = 2
export const BOARD_CENTER_OFFSET = Math.floor(BOARD_SIZE / 2) // 2 for 5x5 board

// 3D Positioning
export const BUILDING_HEIGHT = 0.5
export const WORKER_HEIGHT_OFFSET = 0.3

// Game Rules
export const MAX_BUILDING_LEVEL = 4
export const WIN_LEVEL = 3
export const MAX_PLAYERS = 4
export const DEFAULT_PLAYERS = 2

// Timeouts (in milliseconds)
export const MOVE_TIMEOUT = 5000
export const CONNECTION_TIMEOUT = 10000
export const RECONNECTION_DELAY = 1000

// Colors
export const PLAYER_COLORS = ['#FF4444', '#4444FF', '#44FF44', '#FFFF44'] // Red, Blue, Green, Yellow

// API Configuration
export const DEFAULT_SERVER_URL = 'http://localhost:3000'
export const DEFAULT_WS_URL = 'ws://localhost:3000'

// UI Constants
export const GRID_LINE_COLOR = '#666666'
export const HIGHLIGHT_COLOR = '#FFD700'
export const ERROR_COLOR = '#FF0000'
export const SUCCESS_COLOR = '#00FF00'
