import * as gameSession from "../game/gameSession";

import { findGameById, findPlayersByGameId } from "../game/gameRepository";

import { UserDTO } from "../users/userDTO";
import { WebSocket } from "ws";
import { findUserByUsername } from "../users/userRepository";
import logger from "../logger";

interface Message {
  type: string;
  payload: unknown;
}

/**
 * Broadcast personalized game states to each player
 * Only the current player receives available plays
 */
export async function broadcastPersonalizedGameState(gameId: number, game: any): Promise<void> {
  const { findUsersByGame } = await import('../game/gameRepository');
  const players = await findUsersByGame(gameId);

  // Get current turn state to determine who should get available plays
  const { getCurrentTurnState } = await import('../game/turnManager');
  const turnState = await getCurrentTurnState(gameId);
  const currentPlayerId = turnState?.currentPlayerId;

  logger.info(`Broadcasting personalized game states for game ${gameId}, current player: ${currentPlayerId}`);

  // Send personalized game state to each player
  for (const player of players) {
    const isCurrentPlayer = player.id === currentPlayerId;
    const personalizedGameState = await formatGameStateForPlayer(game, gameId, player.id, isCurrentPlayer);

    logger.info(`Sending game state to player ${player.id} (${player.username}), isCurrentPlayer: ${isCurrentPlayer}, availablePlays: ${personalizedGameState.availablePlays.length}`);

    // Send to specific player
    gameSession.sendToPlayer(gameId, player.id, {
      type: "game_state_update",
      payload: personalizedGameState
    });
  }
}

/**
 * Format game state for frontend (backward compatibility)
 * This version doesn't personalize - used for non-gameplay broadcasts
 */
export async function formatGameStateForFrontend(game: any, gameId: number): Promise<any> {
  return await formatGameStateForPlayer(game, gameId, 0, false);
}

/**
 * Format game state for a specific player (consistent with HTTP API)
 */
async function formatGameStateForPlayer(game: any, gameId: number, playerId: number, isCurrentPlayer: boolean): Promise<any> {
  // Get players
  const { findUsersByGame } = await import('../game/gameRepository');
  const players = await findUsersByGame(gameId);

  // Get turn state and available plays (only for current player in in-progress games)
  const { getCurrentTurnState, getAvailablePlays } = await import('../game/turnManager');
  const turnState = await getCurrentTurnState(gameId);
  let availablePlays: any[] = [];

  // Only generate available plays for the current player in in-progress games
  if (game.game_status === 'in-progress' && isCurrentPlayer) {
    availablePlays = await getAvailablePlays(gameId);
    logger.info(`Generated ${availablePlays.length} available plays for current player ${playerId} in game ${gameId}`);
  } else if (game.game_status === 'in-progress') {
    logger.info(`Skipping available plays for non-current player ${playerId} in game ${gameId}`);
  } else {
    logger.info(`Skipping available plays for player ${playerId} in game ${gameId} (status: ${game.game_status})`);
  }

  // Get board state
  let boardState = null;
  if (game.game_status === 'in-progress' || game.game_status === 'completed') {
    boardState = await getGameBoard(gameId);
  }

  // Helper function to map backend phases to frontend phases
  function mapBackendPhaseToFrontend(backendPhase: string | null, gameStatus: string): string {
    if (gameStatus === 'completed') return 'FINISHED';
    if (gameStatus === 'waiting') return 'SETUP';
    if (backendPhase === 'placing') return 'SETUP';
    if (backendPhase === 'moving' || backendPhase === 'building') return 'PLAYING';
    return 'SETUP';
  }

  // Convert to frontend format (same as HTTP API)
  return {
    id: gameId.toString(),
    board: boardState,
    players: players.map((p, index) => ({
      id: p.id.toString(),
      username: p.username,
      color: index === 0 ? 'blue' : 'red',
      workers: [] // Workers are in board state
    })),
    currentPlayer: turnState?.currentPlayerId?.toString() || '',
    phase: mapBackendPhaseToFrontend(game.game_phase, game.game_status),
    winner: game.winner_id?.toString(),

    // Backend fields for compatibility
    user_creator_id: game.user_creator_id,
    player_count: game.player_count,
    game_status: game.game_status,
    game_phase: game.game_phase,
    current_player_id: game.current_player_id,
    winner_id: game.winner_id,
    created_at: game.created_at,
    started_at: game.started_at,
    finished_at: game.finished_at,

    // Turn management
    turnState,
    availablePlays,

    // WebSocket-specific fields (preserve existing functionality)
    players_count: players.length,
    ready_status_count: undefined // Will be set by caller if needed
  };
}

/**
 * Generate available plays based on the current game phase
 */
async function generateAvailablePlaysForPhase(gameId: number, gamePhase: string) {
  logger.info(`Generating available plays for game ${gameId}, phase: ${gamePhase}`);

  switch (gamePhase) {
    case 'placing':
      // For placing phase, return only empty positions based on actual board state
      const { loadBoardState } = await import('../game/boardState');
      const boardState = await loadBoardState(gameId);

      const availablePlays = [];
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          // Check if position is empty (no worker)
          if (!boardState.cells[x][y].worker) {
            availablePlays.push({
              type: "place_worker",
              position: { x, y }
            });
          }
        }
      }
      logger.info(`Generated ${availablePlays.length} placing moves for game ${gameId} (${25 - availablePlays.length} positions occupied)`);
      return availablePlays;

    case 'moving':
      // Use the proper turn manager to generate moving plays
      const { getAvailablePlays } = await import('../game/turnManager');
      const movingPlays = await getAvailablePlays(gameId);
      logger.info(`Generated ${movingPlays.length} moving plays for game ${gameId}`);
      return movingPlays;

    case 'building':
      // Use the proper turn manager to generate building plays
      const { getAvailablePlays: getAvailablePlaysBuilding } = await import('../game/turnManager');
      const buildingPlays = await getAvailablePlaysBuilding(gameId);
      logger.info(`Generated ${buildingPlays.length} building plays for game ${gameId}`);
      return buildingPlays;

    default:
      logger.warn(`Unknown game phase: ${gamePhase} for game ${gameId}`);
      return [];
  }
}

/* -------------------------------------------------------------------------- */
/*                                    UTILS                                   */
/* -------------------------------------------------------------------------- */

function send(ws: WebSocket, type: string, payload: unknown) {
  ws.send(JSON.stringify({ type: type, payload: payload }));
}

/* -------------------------------------------------------------------------- */
/*                                  HANDLERS                                  */
/* -------------------------------------------------------------------------- */

async function handleMakeMove(ws: WebSocket, message: Message) {
  const payload = message.payload as {
    gameId: number;
    move: {
      type: string;
      workerId?: number;
      position?: { x: number; y: number };
      to?: { x: number; y: number };
      from?: { x: number; y: number };
      fromPosition?: { x: number; y: number };
    };
  };

  logger.info(`Received make_move:`, JSON.stringify(payload, null, 2));

  // Get user from WebSocket
  const user = (ws as any).user;
  if (!user) {
    logger.warn("Move attempt without authentication");
    send(ws, "error", "Not authenticated");
    return;
  }

  logger.info(`Authenticated user making move: id=${user.id}, username=${user.username}`);

  try {
    // Get gameId from the payload
    const gameId = payload.gameId;
    if (!gameId) {
      send(ws, "error", "Game ID required");
      return;
    }

    logger.info(`User ${user.username} (${user.id}) making move in game ${gameId}:`, payload.move);

    // Get current game state
    const currentGame = await findGameById(gameId);
    if (!currentGame) {
      logger.warn(`Game ${gameId} not found for user ${user.username}`);
      send(ws, "error", "Game not found");
      return;
    }

    logger.info(`Current game state: id=${currentGame.id}, status=${currentGame.game_status}, phase=${currentGame.game_phase}, current_player_id=${currentGame.current_player_id}`);

    // Handle case where current_player_id is null (game started before random selection was implemented)
    if (currentGame.current_player_id === null && currentGame.game_status === 'in-progress' && currentGame.game_phase === 'placing') {
      logger.warn(`Game ${gameId} has null current_player_id, setting current player to ${user.id} (${user.username})`);

      // Update the game to set this user as the current player
      const gameRepository = await import("../game/gameRepository");
      await gameRepository.updateGame(gameId, {
        current_player_id: user.id
      });

      // Update our local copy
      currentGame.current_player_id = user.id;
      logger.info(`Set current player to ${user.id} for game ${gameId}`);
    }

    // Validate it's the player's turn
    logger.info(`Turn validation: currentGame.current_player_id=${currentGame.current_player_id}, user.id=${user.id}, user.username=${user.username}`);

    if (currentGame.current_player_id !== user.id) {
      logger.warn(`Move rejected - not player's turn. Current player: ${currentGame.current_player_id}, attempting player: ${user.id} (${user.username})`);
      send(ws, "error", "Not your turn");
      return;
    }

    logger.info(`Turn validation passed for user ${user.username} (${user.id})`);

    // Process the move based on type
    if (payload.move.type === 'place_worker' && payload.move.position) {
      try {
        await processPlaceWorkerMove(gameId, user.id, payload.move.workerId || 1, payload.move.position);
      } catch (moveError) {
        logger.error(`Move processing failed:`, moveError);
        send(ws, "error", `Move failed: ${moveError instanceof Error ? moveError.message : 'Unknown error'}`);
        return;
      }
    } else if (payload.move.type === 'move_worker' && payload.move.position && payload.move.fromPosition) {
      try {
        logger.info(`Processing move_worker: from (${payload.move.fromPosition.x}, ${payload.move.fromPosition.y}) to (${payload.move.position.x}, ${payload.move.position.y})`);

        // Use the turn manager to execute the move
        const { executeMove } = await import('../game/turnManager');
        const moveResult = await executeMove(gameId, user.id, {
          type: 'move_worker',
          workerId: payload.move.workerId,
          fromPosition: payload.move.fromPosition,
          position: payload.move.position
        });

        if (!moveResult.success) {
          send(ws, "error", `Move failed: ${moveResult.error || 'Unknown error'}`);
          return;
        }

        logger.info(`✅ Worker movement successful in game ${gameId}`);

        // Send updated game state to all players
        const updatedGame = await findGameById(gameId);
        await broadcastPersonalizedGameState(gameId, updatedGame);

      } catch (moveError) {
        logger.error(`Worker movement failed:`, moveError);
        send(ws, "error", `Move failed: ${moveError instanceof Error ? moveError.message : 'Unknown error'}`);
        return;
      }
    } else if ((payload.move.type === 'build_block' || payload.move.type === 'build_dome') && payload.move.position) {
      try {
        logger.info(`Processing ${payload.move.type} at (${payload.move.position.x}, ${payload.move.position.y})`);
        logger.info(`Full build move payload:`, JSON.stringify(payload.move, null, 2));

        // Use the turn manager to execute the build
        const { executeMove } = await import('../game/turnManager');

        // Pass the complete move object to preserve all fields
        const moveToExecute = {
          ...payload.move,
          playerId: user.id  // Ensure playerId is set from authenticated user
        };

        logger.info(`Executing build move:`, JSON.stringify(moveToExecute, null, 2));
        const moveResult = await executeMove(gameId, user.id, moveToExecute);

        if (!moveResult.success) {
          send(ws, "error", `Build failed: ${moveResult.error || 'Unknown error'}`);
          return;
        }

        logger.info(`✅ Building successful in game ${gameId}`);

        // Send updated game state to all players
        const updatedGame = await findGameById(gameId);
        await broadcastPersonalizedGameState(gameId, updatedGame);

      } catch (buildError) {
        logger.error(`Building failed:`, buildError);
        send(ws, "error", `Build failed: ${buildError instanceof Error ? buildError.message : 'Unknown error'}`);
        return;
      }
    } else {
      logger.warn(`Invalid move type or missing data:`, payload.move);
      send(ws, "error", "Invalid move type or missing required data");
      return;
    }

    // Acknowledge the move
    send(ws, "move_acknowledged", {
      success: true,
      move: payload.move
    });

    // Get updated game state and broadcast to all players
    const updatedGame = await findGameById(gameId);
    const players = await findPlayersByGameId(gameId);
    const boardState = await getGameBoard(gameId);

    logger.info(`Broadcasting updated game state after move in game ${gameId}`);
    logger.info(`Board state being sent:`, JSON.stringify(boardState, null, 2));

    // Send SAME game state to ALL players
    const formattedGameState = await formatGameStateForFrontend(updatedGame, gameId);
    gameSession.broadcastUpdate(gameId, {
      type: "game_state_update",
      payload: formattedGameState
    });

    // Send available moves ONLY to current player
    if (updatedGame?.current_player_id) {
      logger.info(`🎯 Getting available plays for game ${gameId}, phase: ${updatedGame.game_phase}, current player: ${updatedGame.current_player_id}`);

      const { getAvailablePlays } = await import('../game/turnManager');
      const availablePlays = await getAvailablePlays(gameId);

      logger.info(`🎯 Generated ${availablePlays.length} available plays for current player ${updatedGame.current_player_id} in ${updatedGame.game_phase} phase`);

      if (availablePlays.length > 0) {
        logger.info(`📤 Sending ${availablePlays.length} available_moves to current player ${updatedGame.current_player_id}`);
        gameSession.sendToPlayer(gameId, updatedGame.current_player_id, {
          type: "available_moves",
          payload: availablePlays
        });
      } else {
        logger.warn(`⚠️ No available plays generated for player ${updatedGame.current_player_id} in ${updatedGame.game_phase} phase`);
      }
    }

    // TODO: Switch to next player and send their available moves
    logger.info(`Move processed successfully for user ${user.username} in game ${gameId}`);

  } catch (error) {
    logger.error(`Error processing move for user ${user.username}:`, error);
    send(ws, "error", "Failed to process move");
  }
}

/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

export function handleMessage(ws: WebSocket, message: string) {
  const parsedMessage: Message = JSON.parse(message);
  const { type } = parsedMessage;
  const payload = parsedMessage.payload as {
    gameId: number;
  };

  logger.info(`Received message: ${type}`);
  logger.debug(`Payload: ${JSON.stringify(payload)}`);

  // Get user from authenticated WebSocket
  const user = (ws as any).user;
  if (!user) {
    logger.warn("Message received from unauthenticated WebSocket");
    send(ws, "error", "Not authenticated");
    return;
  }

  switch (type) {
    case "subscribe_game":
      handleSubscribeGame(ws, payload.gameId, user.username);
      break;

    case "unsubscribe_game":
      handleUnsubscribeGame(ws, payload.gameId, user.username);
      break;

    case "join_game":
      handleJoinGame(ws, payload.gameId, user.username);
      break;

    case "make_move":
      handleMakeMove(ws, parsedMessage);
      break;

    default:
      logger.error("Unknown message type:", type);
  }
}

/**
 * Process a place worker move
 */
async function processPlaceWorkerMove(gameId: number, userId: number, workerId: number, position: { x: number; y: number }) {
  logger.info(`Processing place worker move: game=${gameId}, user=${userId}, worker=${workerId}, position=(${position.x}, ${position.y})`);

  try {
    // Use the existing turn management system to execute the move
    const { executeMove } = await import('../game/turnManager');

    const move = {
      type: 'place_worker',
      position: position
    };

    logger.info(`Executing move through turn manager:`, move);

    const result = await executeMove(gameId, userId, move);

    if (!result.success) {
      logger.error(`Move execution failed: ${result.error}`);
      throw new Error(result.error || 'Move execution failed');
    }

    logger.info(`✅ Worker ${workerId} successfully placed at (${position.x}, ${position.y}) by user ${userId} in game ${gameId}`);
    logger.info(`Move result:`, result);

  } catch (error) {
    logger.error(`Error in processPlaceWorkerMove:`, error);
    throw error; // Re-throw so the caller can handle it
  }
}

/**
 * Get the current board state for a game
 */
export async function getGameBoard(gameId: number) {
  logger.info(`Getting board state for game ${gameId}`);

  try {
    // Load actual board state from database
    const { loadBoardState } = await import('../game/boardState');
    const boardState = await loadBoardState(gameId);

    const spaces: any[] = [];

    // Convert our BoardState to frontend format
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const cell = boardState.cells[x][y];
        const space = {
          x,
          y,
          height: cell.height,
          hasDome: cell.hasDome,
          workers: [] as any[]
        };

        // Add worker if present
        if (cell.worker) {
          space.workers.push({
            playerId: cell.worker.playerId,
            workerId: cell.worker.workerId,
            color: cell.worker.playerId === 1 ? 'blue' : 'red'
          });
        }

        spaces.push(space);
      }
    }

    const board = { spaces };

    logger.info(`Loaded board state from database for game ${gameId} with ${spaces.filter(s => s.workers.length > 0).length} workers`);
    return board;

  } catch (error) {
    logger.error(`Failed to load board state for game ${gameId}:`, error);

    // Fallback to empty board
    const spaces: any[] = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        spaces.push({
          x,
          y,
          height: 0,
          hasDome: false,
          workers: []
        });
      }
    }

    return { spaces };
  }
}

/* -------------------------------------------------------------------------- */
/*                                  HANDLERS                                  */
/* -------------------------------------------------------------------------- */

async function handleJoinGame(ws: WebSocket, gameId: number, username: string) {
  logger.info(`User ${username} joining game ${gameId} via WebSocket`);

  const game = await getGameOrError(ws, gameId);
  const user = await getUserOrError(ws, username);
  if (game === undefined || user === undefined) {
    return;
  }

  try {
    // Use the gameService to add player to game (handles all the logic)
    const gameService = await import("../game/gameService");
    await gameService.addPlayerToGame(gameId, user);

    // Now subscribe to WebSocket updates
    const gameSession = await import("../game/gameSession");
    gameSession.addClient(gameId, user.id, ws);

    // Send current game state to the joining user
    const currentGame = await findGameById(gameId);
    const playersInGame = await findPlayersByGameId(gameId);

    if (currentGame) {
      // Include player ready status in the game state
      const playersReadyStatus = gameSession.getPlayersReadyStatus(gameId);
      const currentUserReady = playersReadyStatus.find(p => p.userId === user.id)?.isReady || false;

      // Enhance ready status with usernames
      const gameRepository = await import("../game/gameRepository");
      const usersInGame = await gameRepository.findUsersByGame(gameId);
      const enhancedReadyStatus = playersReadyStatus.map(status => {
        const userInfo = usersInGame.find(u => u.id === status.userId);
        return {
          ...status,
          username: userInfo?.username || 'Unknown',
          displayName: userInfo?.display_name || userInfo?.username || 'Unknown'
        };
      });

      // Use formatted game state with additional WebSocket fields
      const formattedGameState = await formatGameStateForFrontend(currentGame, gameId);
      send(ws, "game_state_update", {
        ...formattedGameState,
        currentUserReady: currentUserReady,
        playersReadyStatus: enhancedReadyStatus
      });
    }

    logger.info(`✅ User ${username} successfully joined game ${gameId} via WebSocket`);

  } catch (error) {
    logger.error(`Failed to join game ${gameId} for user ${username}:`, error);

    if (error instanceof Error) {
      if (error.message === "Game is full") {
        send(ws, "error", "Game is full");
      } else if (error.message === "Game not found") {
        send(ws, "error", "Game not found");
      } else if (error.message.includes("duplicate key")) {
        send(ws, "error", "Already in game");
      } else {
        send(ws, "error", "Failed to join game");
      }
    }
  }
}

async function handleSubscribeGame(ws: WebSocket, gameId: number, username: string) {
  logger.info(`User ${username} is trying to join game ${gameId}`);
  const game = await getGameOrError(ws, gameId);
  const user = await getUserOrError(ws, username);
  if (game === undefined || user === undefined) {
    return;
  }

  logger.info(`User ${user.username} subscribing to game ${gameId}`);

  // Check if this is a new connection or reconnection
  const wasAlreadyInSession = gameSession.isPlayerInGameSession(gameId, user.id);

  gameSession.addClient(gameId, user.id, ws);

  // Send current game state to the connecting user (always send to the connecting user)
  const currentGame = await findGameById(gameId);
  const playersInGame = await findPlayersByGameId(gameId);

  logger.info(`Sending game state to user ${user.username}:`, {
    gameExists: !!currentGame,
    playersCount: playersInGame.length,
    players: playersInGame,
    wasReconnection: wasAlreadyInSession
  });

  if (currentGame) {
    // Include player ready status in the game state
    const gameSession = await import("../game/gameSession");
    const playersReadyStatus = gameSession.getPlayersReadyStatus(gameId);
    const currentUserReady = playersReadyStatus.find(p => p.userId === user.id)?.isReady || false;

    // Use formatted game state with additional WebSocket fields
    const formattedGameState = await formatGameStateForFrontend(currentGame, gameId);
    send(ws, "game_state_update", {
      ...formattedGameState,
      currentUserReady: currentUserReady,
      playersReadyStatus: playersReadyStatus
    });

    // If game is in progress and this is the current player, send available plays
    if (currentGame?.game_status === 'in-progress' &&
        currentGame?.current_player_id === user.id &&
        currentGame?.game_phase) {

      logger.info(`Sending available_plays to reconnected current player ${user.id} in game ${gameId}`);

      // Use the proper turn manager to generate available plays
      const { getAvailablePlays } = await import('../game/turnManager');
      const availablePlays = await getAvailablePlays(gameId);

      send(ws, "available_plays", availablePlays);
    }
  }

  // Only broadcast player list if this was a new connection (not a reconnection)
  if (!wasAlreadyInSession) {
    logger.info(`Broadcasting player list update for new connection`);
    gameSession.broadcastUpdate(gameId, {
      type: "players_in_game",
      payload: playersInGame,
    });

    // Check if game should be ready for confirmation now that a new player connected
    logger.info(`Game ${gameId} WebSocket status check: playersInGame.length=${playersInGame.length}, currentGame.player_count=${currentGame?.player_count}, currentGame.game_status=${currentGame?.game_status}`);
    if (currentGame && playersInGame.length === currentGame.player_count && currentGame.game_status === "waiting") {
      logger.info(`Game ${gameId} is full (${playersInGame.length}/${currentGame.player_count}) - setting to ready for confirmation!`);

      // Update game status to ready (waiting for player confirmations)
      const gameRepository = await import("../game/gameRepository");
      await gameRepository.updateGame(gameId, { game_status: "ready" });

      // Broadcast that game is ready for confirmation to ALL players
      logger.info(`Broadcasting game_ready_for_start for game ${gameId}`);
      gameSession.broadcastUpdate(gameId, { type: "game_ready_for_start" });

      // Send updated game state to ALL players
      const updatedGame = await gameRepository.findGameById(gameId);
      const players = await gameRepository.findPlayersByGameId(gameId);
      const playersReadyStatus = gameSession.getPlayersReadyStatus(gameId);
      logger.info(`Broadcasting game_state_update for game ${gameId} with status: ${updatedGame?.game_status} to all players`);
      // Use formatted game state with additional WebSocket fields
      const formattedGameState = await formatGameStateForFrontend(updatedGame, gameId);
      gameSession.broadcastUpdate(gameId, {
        type: "game_state_update",
        payload: {
          ...formattedGameState,
          playersReadyStatus: playersReadyStatus
        }
      });
    }
  } else {
    logger.info(`Skipping broadcast - user ${user.username} was reconnecting`);
  }
}

async function handleUnsubscribeGame(ws: WebSocket, gameId: number, username: string) {
  logger.info(`User ${username} is unsubscribing from game ${gameId}`);
  const user = await getUserOrError(ws, username);
  if (user === undefined) {
    return;
  }

  // Remove user from game session
  gameSession.removeClient(gameId, user.id);
  logger.info(`User ${username} (${user.id}) unsubscribed from game ${gameId}`);
}

function getGameOrError(ws: WebSocket, gameID: number) {
  const game = findGameById(gameID);
  if (game === undefined) {
    send(ws, "error", "Game not found");
    return;
  }
  return game;
}

function getUserOrError(ws: WebSocket, username: string) {
  const user = findUserByUsername(username);
  if (user === undefined) {
    send(ws, "error", "User not found");
    return;
  }
  return user;
}

/* -------------------------------------------------------------------------- */
/*                                 PUSH EVENTS                                */
/* -------------------------------------------------------------------------- */

export function updatePlayersInGame(gameId: number, players: UserDTO[]) {
  gameSession.broadcastUpdate(gameId, {
    type: "players_in_game",
    payload: players.map((player) => player.username),
  });
}

export function updatePlays(ws: WebSocket, plays: unknown) {
  send(ws, "available_plays", plays);
}
