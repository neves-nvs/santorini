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
 * Generate available plays based on the current game phase
 */
function generateAvailablePlaysForPhase(gameId: number, gamePhase: string) {
  logger.info(`Generating available plays for game ${gameId}, phase: ${gamePhase}`);

  switch (gamePhase) {
    case 'placing':
      // For placing phase, return all empty positions on a 5x5 board
      const availablePlays = [];
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          availablePlays.push({
            type: "place_worker",
            position: { x, y }
          });
        }
      }
      logger.info(`Generated ${availablePlays.length} placing moves for game ${gameId}`);
      return availablePlays;

    case 'moving':
      // TODO: Generate actual movement plays based on board state
      logger.info(`Generated 0 moving plays for game ${gameId} (not implemented)`);
      return [];

    case 'building':
      // TODO: Generate actual building plays based on board state
      logger.info(`Generated 0 building plays for game ${gameId} (not implemented)`);
      return [];

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
      await processPlaceWorkerMove(gameId, user.id, payload.move.workerId || 1, payload.move.position);
    } else {
      send(ws, "error", "Invalid move type");
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

    const broadcastPayload = {
      ...updatedGame,
      players: players,
      board: boardState
    };

    logger.info(`Full broadcast payload:`, JSON.stringify(broadcastPayload, null, 2));

    gameSession.broadcastUpdate(gameId, {
      type: "game_state_update",
      payload: broadcastPayload
    });

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
    username: string;
  };

  logger.info(`Received message: ${type}`);
  logger.debug(`Payload: ${JSON.stringify(payload)}`);

  switch (type) {
    case "subscribe_game":
      handleSubscribeGame(ws, payload.gameId, payload.username);
      break;

    case "join_game":
      handleJoinGame(ws, payload.gameId, payload.username);
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

  // TODO: Implement actual move processing
  // 1. Validate the position is empty
  // 2. Add the worker to the board
  // 3. Update game state
  // 4. Check if this was the last worker placement
  // 5. Switch to next phase or next player

  // For now, just log the move
  logger.info(`Worker ${workerId} placed at (${position.x}, ${position.y}) by user ${userId} in game ${gameId}`);
}

/**
 * Get the current board state for a game
 */
export async function getGameBoard(gameId: number) {
  logger.info(`Getting board state for game ${gameId}`);

  // TODO: Implement actual board state retrieval from database
  // For now, return a simple board structure with some test workers
  const spaces: any[] = [];

  // Create a 5x5 grid
  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      const space = {
        x,
        y,
        height: 0,
        workers: [] as any[]
      };

      // TODO: Query database for actual workers at this position
      // For now, add a test worker at position (3,4) to see if it renders
      if (x === 3 && y === 4) {
        space.workers.push({
          playerId: 1,
          workerId: 1,
          color: 'blue' // or whatever color system you use
        });
        logger.info(`Added test worker at position (${x}, ${y})`);
      }

      spaces.push(space);
    }
  }

  const board = { spaces };

  logger.info(`Generated board with ${board.spaces.length} spaces for game ${gameId}`);
  logger.info(`Board spaces with workers:`, spaces.filter(s => s.workers.length > 0));
  return board;
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

      send(ws, "game_state_update", {
        ...currentGame,
        players: playersInGame,
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

    send(ws, "game_state_update", {
      ...currentGame,
      players: playersInGame,
      currentUserReady: currentUserReady,
      playersReadyStatus: playersReadyStatus
    });

    // If game is in progress and this is the current player, send available plays
    if (currentGame?.game_status === 'in-progress' &&
        currentGame?.current_player_id === user.id &&
        currentGame?.game_phase) {

      logger.info(`Sending available_plays to reconnected current player ${user.id} in game ${gameId}`);

      // Generate available plays based on current game phase
      const availablePlays = generateAvailablePlaysForPhase(gameId, currentGame.game_phase);

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
      gameSession.broadcastUpdate(gameId, {
        type: "game_state_update",
        payload: {
          ...updatedGame,
          players: players,
          playersReadyStatus: playersReadyStatus
        }
      });
    }
  } else {
    logger.info(`Skipping broadcast - user ${user.username} was reconnecting`);
  }
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
