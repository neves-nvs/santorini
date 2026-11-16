// Request bodies and response shapes of the REST API (see docs/api/openapi.yaml)

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
}

export interface CreateGameRequest {
  maxPlayers: number;
}

export interface UserSummary {
  id: number;
  username: string;
  displayName: string;
  createdAt: string;
}
