import React, { useState, useEffect } from 'react'
import DebugAxis from './DebugAxis'
import { BoardBase, Block, Worker, Cell, BoundingBox, MovePreview } from './GamePieces'
import { BoardState, createEmptyBoard, createSampleBoard, gridToWorldCoords } from './board-types'
import { gameplayService } from '../../services/GameplayService'
import { GameState as ServerGameState } from '../../types/game'

interface DebugState {
  showAxis: boolean
  showGrid: boolean
  showWireframe: boolean
  showStats: boolean
  showBoundingBoxes: boolean
  useSampleBoard: boolean
}

interface Board3DProps {
  gameState: ServerGameState
  debugState?: DebugState
  onCellClick?: (x: number, y: number) => void
}

/**
 * Convert server board format to our BoardState format
 */
const parseServerBoard = (serverBoard: any): BoardState => {
  const boardState: BoardState = []

  // Initialize 5x5 board
  for (let x = 0; x < 5; x++) {
    boardState[x] = []
    for (let y = 0; y < 5; y++) {
      boardState[x][y] = {
        buildingLevel: 0,
        worker: null
      }
    }
  }

  // Parse the new server format: {spaces: [{x, y, height, workers}]}
  if (serverBoard?.spaces && Array.isArray(serverBoard.spaces)) {
    console.log('🎲 Parsing new server board format')

    for (const space of serverBoard.spaces) {
      const { x, y, height, workers } = space

      if (x >= 0 && x < 5 && y >= 0 && y < 5) {
        boardState[x][y] = {
          buildingLevel: height || 0,
          worker: workers && workers.length > 0 ? {
            playerId: workers[0].playerId,
            workerId: workers[0].workerId
          } : null
        }

        if (workers && workers.length > 0) {
          console.log(`🎲 Found worker at (${x}, ${y}):`, workers[0])
        }
      }
    }
  } else {
    console.warn('🎲 Server board format not recognized:', serverBoard)
  }

  return boardState
}

/**
 * Main 3D Board Component
 * Renders the Santorini game board with STL models
 */
const Board3D: React.FC<Board3DProps> = ({
  gameState,
  debugState,
  onCellClick
}) => {
  const [boardState, setBoardState] = useState<BoardState>(() => createEmptyBoard())

  // Parse gameState.board to populate the board
  useEffect(() => {
    // Check if debug option to use sample board is enabled
    if (debugState?.useSampleBoard) {
      console.log('Using sample board (debug mode)')
      setBoardState(createSampleBoard())
      return
    }

    if (gameState?.board) {
      console.log('🎲 Parsing server board:', gameState.board)
      console.log('🎲 Board spaces count:', gameState.board.spaces?.length)
      console.log('🎲 Spaces with workers:', gameState.board.spaces?.filter((s: any) => s.workers?.length > 0))

      // Convert server board format to our BoardState format
      const newBoardState = parseServerBoard(gameState.board)
      console.log('🎲 Converted to BoardState:', newBoardState)
      console.log('🎲 BoardState cells with workers:', newBoardState.flat().filter(cell => cell.worker !== null))
      setBoardState(newBoardState)
    } else {
      console.log('🎲 No board in gameState, using empty board')
      console.log('🎲 GameState keys:', Object.keys(gameState || {}))
      // Use empty board when no server data
      setBoardState(createEmptyBoard())
    }
  }, [gameState, debugState?.useSampleBoard])

  const handleCellClick = (gridX: number, gridZ: number) => {
    console.log(`Clicked cell: grid(${gridX}, ${gridZ})`)

    // Check if this is a valid move using gameplayService
    const moveCheck = gameplayService.isValidMove(gridX, gridZ)

    if (moveCheck.valid && moveCheck.workerId) {
      console.log(`Valid move! Placing worker ${moveCheck.workerId} at (${gridX}, ${gridZ})`)

      // Submit the move via gameplayService
      gameplayService.submitPlaceWorkerMove(moveCheck.workerId, { x: gridX, y: gridZ })
    } else {
      console.log(`Invalid move at (${gridX}, ${gridZ})`)
    }

    // Also call the original callback if provided
    if (onCellClick) {
      onCellClick(gridX, gridZ)
    }
  }

  const renderBuildings = (worldX: number, worldZ: number, level: number) => {
    const buildings = []
    const blockTypes: ('base' | 'mid' | 'top' | 'dome')[] = ['base', 'mid', 'top', 'dome']

    for (let i = 0; i < level; i++) {
      buildings.push(
        <Block
          key={`${worldX}-${worldZ}-${i}`}
          type={blockTypes[i]}
          position={[worldX, i * 0.5, worldZ]}
        />
      )
    }
    return buildings
  }

  return (
    <group>
      {/* Debug Axis (toggleable) */}
      <DebugAxis visible={debugState?.showAxis ?? true} />

      {/* Board Base */}
      <BoardBase />

      {/* Move Previews - Show valid placement positions */}
      {gameplayService.getValidPositions().map((validPos) => {
        const [worldX, worldZ] = gridToWorldCoords(validPos.x, validPos.y)
        return (
          <MovePreview
            key={`preview-${validPos.x}-${validPos.y}-${validPos.workerId}`}
            position={[worldX, 0, worldZ]}
            workerId={validPos.workerId}
            visible={true}
          />
        )
      })}

      {/* Grid cells, buildings, and workers */}
      {boardState.map((row, gridX) =>
        row.map((cell, gridZ) => {
          // Convert grid coordinates (0-4) to world coordinates (-2 to +2)
          const [worldX, worldZ] = gridToWorldCoords(gridX, gridZ)

          return (
            <group key={`${gridX}-${gridZ}`}>
              {/* Clickable cell area */}
              <Cell
                position={[worldX, -0.01, worldZ]}
                gridX={gridX}
                gridZ={gridZ}
                onClick={() => handleCellClick(gridX, gridZ)}
              />

              {/* Buildings */}
              {cell.buildingLevel > 0 && renderBuildings(worldX, worldZ, cell.buildingLevel)}

              {/* Bounding Boxes (debug) */}
              {cell.buildingLevel > 0 && (
                <BoundingBox
                  position={[worldX, 0, worldZ]}
                  blockLevel={cell.buildingLevel}
                  visible={debugState?.showBoundingBoxes ?? false}
                />
              )}

              {/* Worker */}
              {cell.worker && (
                <Worker
                  playerId={cell.worker.playerId}
                  position={[worldX, cell.buildingLevel * 0.5 + 0.3, worldZ]}
                />
              )}
            </group>
          )
        })
      )}
    </group>
  )
}

export default Board3D
