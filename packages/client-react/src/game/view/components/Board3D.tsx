import React, { useMemo } from 'react'
import DebugAxis from '@/game/view/debug/DebugAxis'
import { BoardBase, Block, Worker, Cell, BoundingBox, MovePreview, BuildingPreview } from './GamePieces'
import { BoardState, createEmptyBoard } from '@/game/model/board-types'
import { gridToWorldCoords } from './world-coords'
import { WS_MESSAGE_TYPES } from '@santorini/shared'
import { webSocketClient } from '@/game/services/WebSocketClient'
import {
  useSelectedWorker,
  useSetSelectedWorker
} from '@/game/model/gameSelectors'
import { useGameStore } from '@/game/model/gameStore'
import { BUILDING_HEIGHT, WORKER_HEIGHT_OFFSET } from '@/game/model/gameConstants'
import { useRenderTracker } from '@/game/view/debug/performanceMonitor'
import type { DebugState } from '@/game/model/debugState'
import type { AvailableMove, BuildPosition, Move } from '@/game/model/game'
import { EMPTY_AVAILABLE_MOVES } from '@/game/model/game'
import { validPositionsFor } from '@/game/model/validPositions'

interface MoveSubmission {
  gameId: number
  moveIndex: number
  move: {
    type: AvailableMove['type']
    workerId: number
    position: { x: number; y: number }
    fromPosition?: { x: number; y: number }
  }
  serverMoveObject?: Move
}

interface Board3DProps {
  debugState?: Pick<DebugState, 'showAxis' | 'showBoundingBoxes' | 'useSampleBoard'>
  onCellClick?: (x: number, y: number) => void
  // The board is drawn inside the canvas, where React context is not available, so the caller shows the error
  onMoveError?: (message: string) => void
  canPlay?: boolean
}

/**
 * Main 3D Board Component
 * Renders the Santorini game board with STL models
 */
const Board3D: React.FC<Board3DProps> = React.memo(({
  debugState,
  onCellClick,
  onMoveError,
  canPlay = true
}) => {

  // Read the server snapshot directly and adapt its cells for 3D rendering.
  const serverBoard = useGameStore(state => state.gameState?.board)
  const currentSeat = useGameStore(state => state.gameState?.currentSeat)

  // Convert the server board format to the renderer's building-level format.
  const boardState = useMemo<BoardState>(() => {
    if (serverBoard?.cells) {
      return serverBoard.cells.map((row) => row.map((cell) => ({
        buildingLevel: cell.hasDome ? cell.height + 1 : cell.height,
        worker: cell.worker
      })))
    }
    return createEmptyBoard()
  }, [serverBoard])

  // Zustand selectors for optimized re-renders (stable references)
  const selectedWorker = useSelectedWorker()
  const setSelectedWorker = useSetSelectedWorker()

  const currentPlayerMoves = useGameStore(state => canPlay ? state.gameState?.availableMoves ?? EMPTY_AVAILABLE_MOVES : EMPTY_AVAILABLE_MOVES)

  const validPositions = useMemo(
    () => validPositionsFor(currentPlayerMoves, selectedWorker?.workerId),
    [currentPlayerMoves, selectedWorker?.workerId]
  )

  // Handle worker click for selection
  const handleWorkerClick = (workerId: number, seat: number, x: number, y: number) => {
    if (!canPlay) return
    console.log(`Worker ${workerId} (player ${seat}) clicked at (${x}, ${y})`)

    // Only allow selecting current player's workers
    if (seat !== currentSeat) {
      console.log(`Not current player's worker (current: ${currentSeat})`)
      return
    }

    // Check if this worker has any available moves (move_worker or build)
    const moves = useGameStore.getState().gameState?.availableMoves ?? EMPTY_AVAILABLE_MOVES
    const hasMovesForWorker = moves.some(move =>
      (move.type === 'move_worker' || move.type === 'build_block' || move.type === 'build_dome') &&
      move.workerId === workerId
    )

    console.log(`Worker ${workerId} has available moves:`, hasMovesForWorker)

    if (hasMovesForWorker) {
      if (selectedWorker && selectedWorker.workerId === workerId) {
        // Deselect if clicking the same worker
        console.log(`Deselecting worker ${workerId}`)
        setSelectedWorker(null)
      } else {
        // Select the worker
        console.log(`Selecting worker ${workerId} at (${x}, ${y})`)
        setSelectedWorker({ workerId, x, y })
      }
    } else {
      console.log(`Worker ${workerId} has no available moves`)
    }
  }

  // Track component renders for performance monitoring
  useRenderTracker('Board3D', [serverBoard, debugState?.useSampleBoard])

  const handleCellClick = (gridX: number, gridZ: number) => {
    if (!canPlay) return
    console.log(`handleCellClick called: grid(${gridX}, ${gridZ})`)
    console.log(`Clicked cell: grid(${gridX}, ${gridZ})`)

    // Get current game state directly from Zustand store
    const store = useGameStore.getState()
    const gameId = store.gameId
    const moves = store.gameState?.availableMoves ?? EMPTY_AVAILABLE_MOVES
    const currentSelectedWorker = selectedWorker

    console.log('Available moves:', moves)
    console.log('Game ID:', gameId)
    console.log('Selected worker:', currentSelectedWorker)

    // Simple validation: find if clicked position matches any available move
    let validMove: (AvailableMove & { selectedPosition: BuildPosition }) | null = null
    let moveIndex = -1

    if (Array.isArray(moves)) {
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i]

        // For move_worker and build moves, require worker selection first
        if (move.type === 'move_worker' || move.type === 'build_block' || move.type === 'build_dome') {
          if (!currentSelectedWorker || currentSelectedWorker.workerId !== move.workerId) {
            continue // Skip moves for unselected workers
          }
        }

        if (move.validPositions && Array.isArray(move.validPositions)) {
          const matchingPosition: BuildPosition | undefined = move.validPositions.find((pos) =>
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
      console.log('Valid move found:', validMove)

      // Simple, direct submission to server
      const moveData: MoveSubmission = {
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
        console.log('Using server move object:', validMove.selectedPosition.serverMoveObject)
      }

      console.log('Submitting move:', moveData)
      webSocketClient.request(WS_MESSAGE_TYPES.MAKE_MOVE, moveData).catch((error: unknown) => {
        console.error('Failed to submit move:', error)
        onMoveError?.(error instanceof Error ? error.message : 'The move was not accepted')
      })

      // For move_worker, keep selection - building phase needs the same worker
      // For place_worker and build moves, clear selection (turn segment complete)
      if (validMove.type !== 'move_worker') {
        setSelectedWorker(null)
      }
    } else {
      console.log('Invalid move at position:', { gridX, gridZ })
      console.log('No game ID or no valid move found')
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
      {import.meta.env.DEV && <DebugAxis visible={debugState?.showAxis ?? true} />}

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
                console.log(`Building preview onClick callback triggered at (${validPos.x}, ${validPos.y}) for worker ${validPos.workerId}`)
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
                const isCurrentPlayersWorker = cell.worker!.seat === currentSeat
                const workerHasMoves = isCurrentPlayersWorker && currentPlayerMoves.some(move =>
                  (move.type === 'move_worker' || move.type === 'build_block' || move.type === 'build_dome') &&
                  move.workerId === cell.worker!.workerId
                )
                const isSelected = !!(selectedWorker &&
                  selectedWorker.workerId === cell.worker.workerId &&
                  isCurrentPlayersWorker)

                return (
                  <Worker
                    seat={cell.worker.seat}
                    position={[worldX, cell.buildingLevel * BUILDING_HEIGHT + WORKER_HEIGHT_OFFSET, worldZ]}
                    canMove={workerHasMoves}
                    isSelected={isSelected}
                    onClick={() => handleWorkerClick(cell.worker!.workerId, cell.worker!.seat, gridX, gridZ)}
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
