import React, { useMemo } from 'react'
import DebugAxis from '@/game/view/debug/DebugAxis'
import { BoardBase, Block, Worker, Cell, BoundingBox, MovePreview, BuildingPreview } from './GamePieces'
import { BoardState, createEmptyBoard } from '@/game/model/board-types'
import { gridToWorldCoords } from './world-coords'
import { webSocketClient } from '@/game/services/WebSocketClient'
import {
  useSelectedWorker,
  useSetSelectedWorker
} from '@/game/model/gameSelectors'
import { useGameStore } from '@/game/model/gameStore'
import { BUILDING_HEIGHT, WORKER_HEIGHT_OFFSET } from '@/game/model/gameConstants'
import { useRenderTracker } from '@/game/view/debug/performanceMonitor'
import type { AvailableMove, BuildPosition, Move } from '@/game/model/game'
import { logError } from '@/shared/utils/log'

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

interface DebugState {
  showAxis: boolean
  showGrid: boolean
  showWireframe: boolean
  showStats: boolean
  showBoundingBoxes: boolean
  useSampleBoard: boolean
}

interface Board3DProps {
  debugState?: DebugState
  onCellClick?: (x: number, y: number) => void
}

/**
 * Main 3D Board Component
 * Renders the Santorini game board with STL models
 */
const Board3D: React.FC<Board3DProps> = React.memo(({
  debugState,
  onCellClick
}) => {
  // Subscribe to optimized board state from store (already parsed)
  const storeBoardState = useGameStore(state => state.boardState)
  const currentPlayerId = useGameStore(state => state.gameState?.currentPlayerId)

  // Convert store board format to local BoardState format (or use sample/empty)
  const boardState = useMemo<BoardState>(() => {
    if (storeBoardState?.cells) {
      return storeBoardState.cells
    }
    return createEmptyBoard()
  }, [storeBoardState])

  // Zustand selectors for optimized re-renders (stable references)
  const selectedWorker = useSelectedWorker()
  const setSelectedWorker = useSetSelectedWorker()

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

  // Handle worker click for selection
  const handleWorkerClick = (workerId: number, playerId: number, x: number, y: number) => {
    // Only allow selecting current player's workers
    if (playerId !== currentPlayerId) {
      return
    }

    // Check if this worker has any available moves (move_worker or build)
    const moves = useGameStore.getState().currentPlayerMoves
    const hasMovesForWorker = moves.some(move =>
      (move.type === 'move_worker' || move.type === 'build_block' || move.type === 'build_dome') &&
      move.workerId === workerId
    )

    if (hasMovesForWorker) {
      if (selectedWorker && selectedWorker.workerId === workerId) {
        // Deselect if clicking the same worker
        setSelectedWorker(null)
      } else {
        // Select the worker
        setSelectedWorker({ workerId, x, y })
      }
    }
  }

  // Track component renders for performance monitoring
  useRenderTracker('Board3D')

  const handleCellClick = (gridX: number, gridZ: number) => {
    // Get current game state directly from Zustand store
    const store = useGameStore.getState()
    const gameId = store.gameId
    const moves = store.currentPlayerMoves
    const currentSelectedWorker = selectedWorker

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
      }

      try {
        webSocketClient.send('make_move', moveData)

        // For move_worker, keep selection - building phase needs the same worker
        // For place_worker and build moves, clear selection (turn segment complete)
        if (validMove.type !== 'move_worker') {
          setSelectedWorker(null)
        }

      } catch (error) {
        logError('Failed to submit move:', error)
      }
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
                const isCurrentPlayersWorker = cell.worker!.playerId === currentPlayerId
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
