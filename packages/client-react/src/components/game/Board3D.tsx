import React, { useState, useEffect, useMemo } from 'react'
import DebugAxis from './DebugAxis'
import { BoardBase, Block, Worker, Cell, BoundingBox, MovePreview, BuildingPreview } from './GamePieces'
import { BoardState, createEmptyBoard, createSampleBoard, gridToWorldCoords } from './board-types'
import { webSocketClient } from '../../services/WebSocketClient'
import { GameState as ServerGameState } from '../../types/game'
import { useApp } from '../../store/AppContext'
import {
  useSelectedWorker,
  useSetSelectedWorker
} from '../../store/gameSelectors'
import { useGameStore } from '../../store/gameStore'
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
 * Server sends: { cells: CellView[][] } where CellView = { height, hasDome, worker: { playerId, workerId } | null }
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

  // Parse current server format: { cells: CellView[][] }
  if (serverBoard?.cells && Array.isArray(serverBoard.cells)) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const cell = serverBoard.cells[x]?.[y]
        if (cell) {
          // Server sends height (0-3) + hasDome. Convert to buildingLevel 0-4
          const height = cell.height || 0
          boardState[x][y] = {
            buildingLevel: cell.hasDome ? height + 1 : height,
            worker: cell.worker ? {
              playerId: cell.worker.playerId,
              workerId: cell.worker.workerId
            } : null
          }
        }
      }
    }
  }
  // Legacy format: { spaces: [{x, y, height, workers}] }
  else if (serverBoard?.spaces && Array.isArray(serverBoard.spaces)) {
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

  // Zustand selectors for optimized re-renders (stable references)
  const selectedWorker = useSelectedWorker()

  const setSelectedWorker = useSetSelectedWorker()
  const { state: appState } = useApp()

  // Get all current player moves and compute valid positions manually to avoid unstable selectors
  const currentPlayerMoves = useGameStore(state => state.currentPlayerMoves)

  // Memoize valid positions calculation to prevent infinite re-renders
  const validPositions = useMemo(() => {
    const selectedWorkerId = selectedWorker?.workerId
    const moves = currentPlayerMoves
    const positions: Array<{
      x: number
      y: number
      workerId: number
      type: string
    }> = []

    if (!Array.isArray(moves)) return positions

    for (const move of moves) {
      // For placement phase, show all positions (no worker selection needed)
      if (move.type === 'place_worker') {
        for (const pos of move.validPositions) {
          positions.push({
            x: pos.x,
            y: pos.y,
            workerId: move.workerId,
            type: move.type
          })
        }
      }
      // For movement/building phase, ONLY show positions for selected worker
      // User must click a worker first to see available moves
      else if (selectedWorkerId && move.workerId === selectedWorkerId) {
        for (const pos of move.validPositions) {
          positions.push({
            x: pos.x,
            y: pos.y,
            workerId: move.workerId,
            type: move.type
          })
        }
      }
    }

    return positions
  }, [currentPlayerMoves, selectedWorker?.workerId])

  // Memoize current player ID to prevent unnecessary recalculations
  const currentPlayerId = useMemo(() => {
    const currentUsername = appState.username
    const currentPlayerObj = gameState?.players?.find((player: any) =>
      (player.username || player.name) === currentUsername
    )
    return typeof currentPlayerObj === 'object' ? currentPlayerObj?.id : currentPlayerObj
  }, [appState.username, gameState?.players])

  // Valid positions are now handled by Zustand selector (already computed above as 'validPositions')

  // Handle worker click for selection
  const handleWorkerClick = (workerId: number, playerId: number, x: number, y: number) => {
    console.log(`🎯 Worker ${workerId} (player ${playerId}) clicked at (${x}, ${y})`)

    // Only allow selecting current player's workers
    if (playerId !== gameState?.currentPlayerId) {
      console.log(`🎯 Not current player's worker (current: ${gameState?.currentPlayerId})`)
      return
    }

    // Check if this worker has any available moves (move_worker or build)
    const moves = useGameStore.getState().currentPlayerMoves
    const hasMovesForWorker = moves.some(move =>
      (move.type === 'move_worker' || move.type === 'build_block' || move.type === 'build_dome') &&
      move.workerId === workerId
    )

    console.log(`🎯 Worker ${workerId} has available moves:`, hasMovesForWorker)

    if (hasMovesForWorker) {
      if (selectedWorker && selectedWorker.workerId === workerId) {
        // Deselect if clicking the same worker
        console.log(`🎯 Deselecting worker ${workerId}`)
        setSelectedWorker(null)
      } else {
        // Select the worker
        console.log(`🎯 Selecting worker ${workerId} at (${x}, ${y})`)
        setSelectedWorker({ workerId, x, y })
      }
    } else {
      console.log(`🎯 Worker ${workerId} has no available moves`)
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
      boardCells: gameState?.board?.cells?.length,
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

    // Get current game state directly from Zustand store
    const store = useGameStore.getState()
    const gameId = store.gameId
    const moves = store.currentPlayerMoves
    const currentSelectedWorker = selectedWorker

    console.log('🎯 Available moves:', moves)
    console.log('🎯 Game ID:', gameId)
    console.log('🎯 Selected worker:', currentSelectedWorker)

    // Simple validation: find if clicked position matches any available move
    let validMove: any = null
    let moveIndex = -1

    if (Array.isArray(moves)) {
      for (let i = 0; i < moves.length; i++) {
        const move: any = moves[i]

        // For move_worker and build moves, require worker selection first
        if (move.type === 'move_worker' || move.type === 'build_block' || move.type === 'build_dome') {
          if (!currentSelectedWorker || currentSelectedWorker.workerId !== move.workerId) {
            continue // Skip moves for unselected workers
          }
        }

        if (move.validPositions && Array.isArray(move.validPositions)) {
          const matchingPosition: any = move.validPositions.find((pos: any) =>
            pos.x === gridX && pos.y === gridZ
          )
          if (matchingPosition) {
            validMove = { ...move, selectedPosition: matchingPosition }
            moveIndex = i
            break
          }
        }
      }
    }

    if (validMove && gameId) {
      console.log('✅ Valid move found:', validMove)

      // Simple, direct submission to server
      const moveData: any = {
        gameId: parseInt(gameId, 10), // Convert string to number for backend
        moveIndex: moveIndex, // Server can validate this was actually sent
        move: {
          type: validMove.type,
          workerId: validMove.workerId,
          position: { x: gridX, y: gridZ },
          fromPosition: validMove.fromPosition
        }
      }

      // Include server move object if available (preferred)
      if (validMove.selectedPosition?.serverMoveObject) {
        moveData.serverMoveObject = validMove.selectedPosition.serverMoveObject
        console.log('🎯 Using server move object:', validMove.selectedPosition.serverMoveObject)
      }

      try {
        console.log('📤 Submitting move:', moveData)
        webSocketClient.send('make_move', moveData)
        console.log('✅ Move submitted successfully')

        // For move_worker, keep selection - building phase needs the same worker
        // For place_worker and build moves, clear selection (turn segment complete)
        if (validMove.type !== 'move_worker') {
          setSelectedWorker(null)
        }

        console.log('🧹 Move submitted - waiting for server response to update game state')
      } catch (error) {
        console.error('❌ Failed to submit move:', error)
      }
    } else {
      console.log('❌ Invalid move at position:', { gridX, gridZ })
      console.log('❌ No game ID or no valid move found')
      // Don't clear selection on invalid click - user might just have misclicked
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
      {validPositions.map((validPos) => {
        const [worldX, worldZ] = gridToWorldCoords(validPos.x, validPos.y)
        const currentBuildingLevel = boardState[validPos.x][validPos.y].buildingLevel
        const boardHeight = currentBuildingLevel * BUILDING_HEIGHT

        // Check if this is a building move based on move type
        const isBuildingMove = validPos.type === 'build_block' || validPos.type === 'build_dome'

        if (isBuildingMove) {
          // Derive building level from current board state: next level = current + 1
          const nextBuildingLevel = currentBuildingLevel + 1
          return (
            <BuildingPreview
              key={`build-preview-${validPos.x}-${validPos.y}-${validPos.workerId}`}
              position={[worldX, boardHeight + 0.1, worldZ]}
              buildingLevel={nextBuildingLevel}
              moveType={validPos.type as 'build_block' | 'build_dome'}
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
                // Check if this worker belongs to current player AND has available moves
                const isCurrentPlayersWorker = cell.worker!.playerId === gameState?.currentPlayerId
                const workerHasMoves = isCurrentPlayersWorker && currentPlayerMoves.some(move =>
                  (move.type === 'move_worker' || move.type === 'build_block' || move.type === 'build_dome') &&
                  move.workerId === cell.worker!.workerId
                )
                const isSelected = !!(selectedWorker &&
                  selectedWorker.workerId === cell.worker.workerId &&
                  isCurrentPlayersWorker)

                return (
                  <Worker
                    playerId={cell.worker.playerId}
                    position={[worldX, cell.buildingLevel * BUILDING_HEIGHT + WORKER_HEIGHT_OFFSET, worldZ]}
                    gameState={gameState}
                    canMove={workerHasMoves}
                    isSelected={isSelected}
                    onClick={() => handleWorkerClick(cell.worker!.workerId, cell.worker!.playerId, gridX, gridZ)}
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
