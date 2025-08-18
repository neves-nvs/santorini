import React, { useState, useEffect, useMemo } from 'react'
import DebugAxis from './DebugAxis'
import { BoardBase, Block, Worker, Cell, BoundingBox, MovePreview, BuildingPreview } from './GamePieces'
import { BoardState, createEmptyBoard, createSampleBoard, gridToWorldCoords } from './board-types'
import { gameplayService } from '../../services/GameplayService'
import { GameState as ServerGameState } from '../../types/game'
import { useGame } from '../../store/GameContext'
import { BOARD_SIZE, BUILDING_HEIGHT, WORKER_HEIGHT_OFFSET } from '../../constants/gameConstants'
import { measureOperation, useRenderTracker } from '../../utils/performanceMonitor'

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

  // Initialize board
  for (let x = 0; x < BOARD_SIZE; x++) {
    boardState[x] = []
    for (let y = 0; y < BOARD_SIZE; y++) {
      boardState[x][y] = {
        buildingLevel: 0,
        worker: null
      }
    }
  }

  // Parse the new server format: {spaces: [{x, y, height, workers}]}
  if (serverBoard?.spaces && Array.isArray(serverBoard.spaces)) {
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
      }
    }
  }

  return boardState
}

/**
 * Main 3D Board Component
 * Renders the Santorini game board with STL models
 */
const Board3D: React.FC<Board3DProps> = React.memo(({
  gameState,
  debugState,
  onCellClick
}) => {

  const [boardState, setBoardState] = useState<BoardState>(() => createEmptyBoard())
  const [selectedWorker, setSelectedWorker] = useState<{workerId: number, x: number, y: number} | null>(null)
  const { state: gameContextState } = useGame()

  // Get workers that can move (for highlighting)
  const getMovableWorkers = (): Array<{workerId: number, x: number, y: number}> => {
    const currentPlayerMoves = gameContextState.currentPlayerMoves
    const movableWorkers: Array<{workerId: number, x: number, y: number}> = []

    // Debug: Log all workers on the board
    console.log('🎯 All workers on board:')
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const cell = boardState[x][y]
        if (cell.worker) {
          console.log(`  Worker at (${x}, ${y}): playerId=${cell.worker.playerId}, workerId=${cell.worker.workerId}`)
        }
      }
    }

    // Only show movable workers for move_worker type moves
    if (!Array.isArray(currentPlayerMoves)) {
      console.warn('🎯 currentPlayerMoves is not an array in getMovableWorkers:', currentPlayerMoves)
      return movableWorkers
    }

    const moveWorkerMoves = currentPlayerMoves.filter(move => move.type === 'move_worker')
    console.log('🎯 Move worker moves from server:', moveWorkerMoves)

    // Get current player ID from username
    const currentUsername = gameContextState.username
    const currentPlayer = gameState?.players?.find((player: any) =>
      (player.username || player.name) === currentUsername
    )
    // Ensure we get a numeric player ID
    const currentPlayerId = typeof currentPlayer === 'object' ? currentPlayer?.id : currentPlayer

    console.log('🎯 Current username:', currentUsername, 'Current player ID:', currentPlayerId)

    for (const move of moveWorkerMoves) {
      // Find the worker's current position on the board
      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
          const cell = boardState[x][y]
          if (cell.worker &&
              cell.worker.workerId === move.workerId &&
              cell.worker.playerId === Number(currentPlayerId)) {  // Only current player's workers
            movableWorkers.push({
              workerId: move.workerId,
              x: x,
              y: y
            })
            break
          }
        }
      }
    }

    return movableWorkers
  }

  // Get valid positions for the selected worker or all workers during placement
  const getValidPositionsFromContext = (): Array<{ x: number, y: number, workerId: 1 | 2, type: string, buildingLevel?: number, buildingType?: string, moveType?: string, serverMoveObject?: any }> => {
    const currentPlayerMoves = gameContextState.currentPlayerMoves
    const positions: Array<{ x: number, y: number, workerId: 1 | 2, type: string, buildingLevel?: number, buildingType?: string, moveType?: string, serverMoveObject?: any }> = []

    // Get valid positions for current player moves

    // Ensure currentPlayerMoves is an array before iterating
    if (!Array.isArray(currentPlayerMoves)) {
      console.warn('🎯 currentPlayerMoves is not an array:', currentPlayerMoves)
      return positions
    }

    for (const move of currentPlayerMoves) {
      // For placement phase, show all positions
      if (move.type === 'place_worker') {
        for (const pos of move.validPositions) {
          const posWithBuilding = pos as any
          positions.push({
            x: pos.x,
            y: pos.y,
            workerId: move.workerId,
            type: move.type,
            // Preserve building information if available
            buildingLevel: posWithBuilding.buildingLevel,
            buildingType: posWithBuilding.buildingType,
            moveType: posWithBuilding.moveType
          })
        }
      }
      // For building phase, show all building moves (only one worker can build anyway)
      else if (move.type === 'build_block') {
        console.log(`🎯 Adding building moves for worker ${move.workerId}:`, move.validPositions)
        for (const pos of move.validPositions) {
          const posWithBuilding = pos as any
          positions.push({
            x: pos.x,
            y: pos.y,
            workerId: move.workerId,
            type: move.type,
            // Preserve building information if available
            buildingLevel: posWithBuilding.buildingLevel,
            buildingType: posWithBuilding.buildingType,
            moveType: posWithBuilding.moveType
          })
        }
      }
      // For movement phase, only show positions for selected worker
      else if (selectedWorker && move.workerId === selectedWorker.workerId) {
        console.log(`🎯 Adding moves for selected worker ${selectedWorker.workerId}:`, move.validPositions)
        for (const pos of move.validPositions) {
          const posWithBuilding = pos as any
          positions.push({
            x: pos.x,
            y: pos.y,
            workerId: move.workerId,
            type: move.type,
            // Preserve building information if available
            buildingLevel: posWithBuilding.buildingLevel,
            buildingType: posWithBuilding.buildingType,
            moveType: posWithBuilding.moveType,
            serverMoveObject: posWithBuilding.serverMoveObject
          })
        }
      }
    }

    // Return calculated valid positions
    return positions
  }

  // Find worker position from board state
  const findWorkerPosition = (workerId: 1 | 2, playerId: number): { x: number, y: number } | undefined => {
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const cell = boardState[x][y]
        if (cell.worker && cell.worker.playerId === playerId && cell.worker.workerId === workerId) {
          return { x, y }
        }
      }
    }
    return undefined
  }

  // Handle worker click for selection
  const handleWorkerClick = (workerId: number, x: number, y: number) => {
    console.log(`🎯 Worker ${workerId} clicked at (${x}, ${y})`)

    // Check if this worker can move
    const movableWorkers = getMovableWorkers()
    console.log('🎯 Movable workers:', JSON.stringify(movableWorkers, null, 2))
    const canMove = movableWorkers.some(w => w.workerId === workerId && w.x === x && w.y === y)
    console.log(`🎯 Worker ${workerId} can move:`, canMove)

    if (canMove) {
      if (selectedWorker && selectedWorker.workerId === workerId && selectedWorker.x === x && selectedWorker.y === y) {
        // Deselect if clicking the same worker
        console.log(`🎯 Deselecting worker ${workerId}`)
        setSelectedWorker(null)
      } else {
        // Select the worker
        console.log(`🎯 Selecting worker ${workerId} at (${x}, ${y})`)
        setSelectedWorker({ workerId, x, y })
      }
    } else {
      console.log(`🎯 Worker ${workerId} cannot move`)
    }
  }

  // Track component renders for performance monitoring
  useRenderTracker('Board3D', [gameState?.board, debugState?.useSampleBoard])

  // Memoize board state parsing to avoid expensive recalculations
  const parsedBoardState = useMemo(() => {
    return measureOperation('Board3D.parseServerBoard', () => {
      // Check if debug option to use sample board is enabled
      if (debugState?.useSampleBoard) {
        console.log('Using sample board (debug mode)')
        return createSampleBoard()
      }

      if (gameState?.board) {
        // Convert server board format to our BoardState format
        return parseServerBoard(gameState.board)
      } else {
        return createEmptyBoard()
      }
    }, {
      boardSpaces: gameState?.board?.spaces?.length,
      debugMode: debugState?.useSampleBoard
    })
  }, [gameState?.board, debugState?.useSampleBoard]) // Only re-parse when board data or debug state changes

  // Update board state when parsed state changes
  useEffect(() => {
    setBoardState(parsedBoardState)
  }, [parsedBoardState])

  const handleCellClick = (gridX: number, gridZ: number) => {
    console.log(`🔧 handleCellClick called: grid(${gridX}, ${gridZ})`)
    console.log(`Clicked cell: grid(${gridX}, ${gridZ})`)

    // Check if this is a valid position for the current move type
    const validPositions = getValidPositionsFromContext()
    const validPosition = validPositions.find(pos => pos.x === gridX && pos.y === gridZ)

    if (validPosition) {
      // Use server move object if available (preferred method for all move types)
      if (validPosition.serverMoveObject) {
        console.log(`🎯 Using exact server move object for ${validPosition.type}:`, validPosition.serverMoveObject)
        gameplayService.submitServerMove(validPosition.serverMoveObject)
        setSelectedWorker(null) // Clear selection after any move
      }
      // Fallback methods if no server object available
      else if (validPosition.type === 'place_worker') {
        console.log(`Valid placement! Placing worker ${validPosition.workerId} at (${gridX}, ${gridZ})`)
        gameplayService.submitPlaceWorkerMove(validPosition.workerId, { x: gridX, y: gridZ })
      } else if (validPosition.type === 'move_worker' && selectedWorker) {
        console.log(`Valid movement! Moving worker ${selectedWorker.workerId} from (${selectedWorker.x}, ${selectedWorker.y}) to (${gridX}, ${gridZ})`)
        gameplayService.submitMoveWorker(
          selectedWorker.workerId as 1 | 2,
          { x: gridX, y: gridZ },
          { x: selectedWorker.x, y: selectedWorker.y }
        )
        setSelectedWorker(null) // Clear selection after move
      } else if (validPosition.type === 'build_block') {
        // Handle building - use the exact server move object
        console.log(`🏗️ Valid build! Building at (${gridX}, ${gridZ}) for worker ${validPosition.workerId}`)
        console.log(`🏗️ Building position data:`, validPosition)
        console.log(`🏗️ Server move object:`, validPosition.serverMoveObject)

        try {
          if (validPosition.serverMoveObject) {
            // Use the exact move object from the server
            console.log(`🏗️ Sending exact server move object:`, validPosition.serverMoveObject)
            gameplayService.submitServerMove(validPosition.serverMoveObject)
          } else {
            // Fallback to the old method if no server object available
            console.warn(`🏗️ No server move object available, using fallback method`)
            const currentPlayerId = gameContextState.gameState?.currentPlayer
            const workerPosition = currentPlayerId ? findWorkerPosition(validPosition.workerId, parseInt(currentPlayerId)) : undefined
            gameplayService.submitBuild({ x: gridX, y: gridZ }, validPosition.workerId, workerPosition)
          }
        } catch (error) {
          console.error(`🏗️ Failed to submit build move:`, error)
        }
        setSelectedWorker(null) // Clear selection after build
      }
    } else {
      console.log(`Invalid move at (${gridX}, ${gridZ})`)
      // Clear worker selection if clicking invalid position
      setSelectedWorker(null)
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
          position={[worldX, i * BUILDING_HEIGHT, worldZ]}
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

      {/* Move Previews - Show valid placement/movement/building positions */}
      {getValidPositionsFromContext().map((validPos) => {
        const [worldX, worldZ] = gridToWorldCoords(validPos.x, validPos.y)
        const boardHeight = boardState[validPos.x][validPos.y].buildingLevel * BUILDING_HEIGHT

        // Check if this is a building move with building information
        const isBuildingMove = validPos.type === 'build_block' &&
          ('buildingLevel' in validPos || 'buildingType' in validPos || 'moveType' in validPos)

        if (isBuildingMove) {
          // Use BuildingPreview for building moves
          const buildPos = validPos as any // Type assertion for building properties
          return (
            <BuildingPreview
              key={`build-preview-${validPos.x}-${validPos.y}-${validPos.workerId}`}
              position={[worldX, boardHeight + 0.1, worldZ]}
              buildingLevel={buildPos.buildingLevel}
              buildingType={buildPos.buildingType}
              moveType={buildPos.moveType}
              visible={true}
              onClick={() => {
                console.log(`🔧 Building preview onClick callback triggered at (${validPos.x}, ${validPos.y}) for worker ${validPos.workerId}`)
                handleCellClick(validPos.x, validPos.y)
              }}
            />
          )
        } else {
          // Use MovePreview for placement and movement
          return (
            <MovePreview
              key={`move-preview-${validPos.x}-${validPos.y}-${validPos.workerId}`}
              position={[worldX, boardHeight + 0.1, worldZ]}
              workerId={validPos.workerId}
              visible={true}
              onClick={() => {
                console.log(`Move preview clicked at (${validPos.x}, ${validPos.y}) for worker ${validPos.workerId}`)
                handleCellClick(validPos.x, validPos.y)
              }}
            />
          )
        }
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
              {cell.worker && (() => {
                const movableWorkers = getMovableWorkers()
                const canMove = movableWorkers.some(w =>
                  w.workerId === cell.worker!.workerId && w.x === gridX && w.y === gridZ
                )
                const isSelected = !!(selectedWorker &&
                  selectedWorker.workerId === cell.worker.workerId &&
                  selectedWorker.x === gridX &&
                  selectedWorker.y === gridZ)

                return (
                  <Worker
                    playerId={cell.worker.playerId}
                    position={[worldX, cell.buildingLevel * BUILDING_HEIGHT + WORKER_HEIGHT_OFFSET, worldZ]}
                    gameState={gameState}
                    canMove={canMove}
                    isSelected={isSelected}
                    onClick={() => handleWorkerClick(cell.worker!.workerId, gridX, gridZ)}
                  />
                )
              })()}
            </group>
          )
        })
      )}
    </group>
  )
})

export default Board3D
