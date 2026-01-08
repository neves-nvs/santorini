export class GameError extends Error {
  public readonly httpStatus: number = 400;

  constructor(message: string, public userMessage: string = message) {
    super(message);
    this.name = 'GameError';
  }
}

export class GameNotFoundError extends GameError {
  public readonly httpStatus = 404;

  constructor(gameId: number) {
    super(`Game with ID ${gameId} not found`, 'Game not found');
  }
}

export class GameFullError extends GameError {
  public readonly httpStatus = 409;

  constructor(gameId: number, currentPlayers: number, maxPlayers: number) {
    super(`Game ${gameId} is full (${currentPlayers}/${maxPlayers})`, 'Game is full');
  }
}

export class PlayerAlreadyInGameError extends GameError {
  public readonly httpStatus = 409;

  constructor(gameId: number, userId: number) {
    super(`Player ${userId} is already in game ${gameId}`, 'Already in game');
  }
}

export class InvalidGameStateError extends GameError {
  public readonly httpStatus = 409;

  constructor(gameId: number, currentState: string, expectedState: string) {
    super(`Game ${gameId} is in state '${currentState}', expected '${expectedState}'`, 'Invalid game state');
  }
}

export class NotPlayerTurnError extends GameError {
  public readonly httpStatus = 403;

  constructor(gameId: number, userId: number, currentPlayerId: number) {
    super(`It's not player ${userId}'s turn in game ${gameId} (current: ${currentPlayerId})`, 'Not your turn');
  }
}

export class PlayerNotInGameError extends GameError {
  public readonly httpStatus = 403;

  constructor(gameId: number, userId: number) {
    super(`Player ${userId} is not in game ${gameId}`, 'Player not in game');
  }
}

/**
 * Get HTTP status code for an error
 */
export function getHttpStatus(error: unknown): number {
  if (error instanceof GameError) {
    return error.httpStatus;
  }
  return 500;
}

/**
 * Get user-friendly message for an error
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof GameError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
