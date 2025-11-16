# Santorini Online - System Architecture

## Overview

Santorini Online is a real-time multiplayer board game built with a Node.js backend and React frontend, featuring WebSocket-based real-time updates for synchronized gameplay.

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for HTTP API
- **WebSocket**: Native WebSocket (ws library) for real-time communication
- **Database**: PostgreSQL with Kysely query builder
- **Authentication**: JWT tokens (HTTP-only cookies + Bearer tokens)
- **Testing**: Jest with Testcontainers for integration tests

### Frontend
- **Framework**: React 18 with TypeScript
- **Rendering**: @react-three/fiber for 3D game board
- **State Management**: Zustand for game state
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Testing**: Vitest

### Shared
- **Type Definitions**: Shared TypeScript types in `packages/shared/`
- **WebSocket Protocol**: Typed message contracts

## Architecture Patterns

### Backend Architecture

```
packages/server/src/
├── main.ts                 # Server entry point, WebSocket setup
├── app.ts                  # Express app configuration
├── auth/                   # Authentication & authorization
│   ├── authController.ts   # Login, token generation
│   ├── passport.ts         # JWT strategy
│   └── webSocketAuth.ts    # WebSocket authentication
├── users/                  # User management
│   ├── userController.ts   # User CRUD endpoints
│   └── userRepository.ts   # Database access
├── game/                   # Game logic
│   ├── gameController.ts   # Game HTTP endpoints
│   ├── gameService.ts      # Business logic
│   ├── gameRepository.ts   # Database access
│   ├── gameSession.ts      # WebSocket session management
│   ├── gameEngine.ts       # Move validation & processing
│   ├── turnManager.ts      # Turn state & available moves
│   └── boardState.ts       # Board state management
├── board/                  # Board mechanics
│   ├── board.ts            # Board operations
│   └── pieceRepository.ts  # Piece database access
└── websockets/             # WebSocket handlers
    ├── messageHandler.ts   # Message routing & handlers
    └── authenticatedWebsocket.ts  # Type definitions
```

### Frontend Architecture

```
packages/client-react/src/
├── main.tsx                # App entry point
├── App.tsx                 # Root component with routing
├── pages/                  # Route components
│   ├── AuthPage.tsx        # Login/register
│   ├── LobbyPage.tsx       # Game list
│   └── GamePage.tsx        # Active game
├── components/
│   ├── 3d/                 # Three.js game board
│   ├── game/               # Game UI components
│   │   ├── GameLobby.tsx   # Pre-game lobby
│   │   └── PlayerList.tsx  # Player display
│   └── ui/                 # Reusable UI components
├── services/
│   ├── ApiService.ts       # HTTP API client
│   └── WebSocketService.ts # WebSocket client
├── store/
│   ├── AppContext.tsx      # Global app state (auth)
│   ├── gameStore.ts        # Game state (Zustand)
│   └── gameSelectors.ts    # Derived state selectors
├── hooks/                  # Custom React hooks
│   ├── useGameConnection.ts    # WebSocket lifecycle
│   ├── useGameLifecycle.ts     # Game phase logic
│   └── useReadyState.ts        # Player ready state
└── types/                  # TypeScript definitions
```

## Communication Protocols

### HTTP API

**Authentication**
- `POST /session` - Login (returns JWT in HTTP-only cookie)
- `POST /users` - Register new user
- `GET /token` - Get JWT token for WebSocket auth
- `GET /me` - Get current user info

**Game Management**
- `GET /games` - List all games
- `POST /games` - Create new game
- `GET /games/:id` - Get game state
- `POST /games/:id/players` - Join game (HTTP fallback)
- `POST /games/:id/ready` - Set player ready status

### WebSocket Protocol

**Connection**
- Authentication via JWT token (query param or Authorization header)
- Automatic reconnection with exponential backoff
- Per-game subscription model

**Client → Server Messages**
```typescript
subscribe_game    { gameId: number }
unsubscribe_game  { gameId: number }
join_game         { gameId: number }
make_move         { gameId: number, move: GameMove }
set_ready         { gameId: number, isReady: boolean }
```

**Server → Client Messages**
```typescript
game_state_update { game: GameState, board: BoardState, players: Player[] }
available_moves   { moves: AvailableMove[] }  // Only to current player
players_in_game   { players: string[] }
error             { message: string }
```

## Real-Time Update Flow

### Game State Broadcasting

1. **Unified State Model**: All players receive identical base game state
2. **Selective Move Data**: Only current player receives `available_moves`
3. **Broadcast Pattern**:
   ```typescript
   // Send to ALL players
   gameSession.broadcastUpdate(gameId, {
     type: 'game_state_update',
     payload: gameState
   })
   
   // Send to CURRENT player only
   gameSession.sendToPlayer(gameId, currentPlayerId, {
     type: 'available_moves',
     payload: moves
   })
   ```

### Session Management

**Backend** (`gameSession.ts`)
- Maintains `Map<gameId, Map<userId, WebSocket>>`
- Tracks player ready status per game
- Handles broadcast and targeted messaging

**Frontend** (`WebSocketService.ts`)
- Single WebSocket connection per user
- Event-based message handling
- Automatic state synchronization with Zustand store

## Authentication Flow

1. User logs in via `POST /session`
2. Server returns JWT in HTTP-only cookie
3. Frontend calls `GET /token` to get JWT for WebSocket
4. WebSocket connection includes JWT in query param
5. Server validates JWT and attaches user to WebSocket
6. All subsequent messages use authenticated WebSocket

## Game Lifecycle

### Phase 1: Waiting
- Players join game via HTTP `POST /games/:id/players`
- Players subscribe to game updates via WebSocket
- Players set ready status via `set_ready` message
- When all players ready, game transitions to `placing` phase

### Phase 2: Placing Workers
- Each player places 2 workers on the board
- Turn-based: current player receives `available_moves`
- Move validation in `gameEngine.ts`
- After all workers placed, transitions to `playing` phase

### Phase 3: Playing
- Turn-based gameplay: move worker, then build
- Win condition: worker moves from level 2 to level 3
- Move validation ensures legal moves only
- Game ends when win condition met

## State Management

### Backend State
- **Database**: Persistent game state (PostgreSQL)
- **Memory**: Active WebSocket connections, ready status
- **Source of Truth**: Database for game state, memory for session state

### Frontend State
- **AppContext**: User authentication, global UI state
- **gameStore (Zustand)**: Current game state, board state, moves
- **Optimized Indices**: Worker position maps for O(1) lookups
- **Derived State**: Computed via selectors, not stored

## Data Flow

### Move Processing
```
1. User clicks board → Frontend validates selection
2. Frontend sends make_move via WebSocket
3. Backend validates move in gameEngine
4. Backend updates database
5. Backend broadcasts game_state_update to all players
6. Backend sends available_moves to next player
7. Frontend updates Zustand store
8. React re-renders affected components
```

### State Synchronization
- **Primary**: WebSocket push updates
- **Fallback**: HTTP polling disabled (real-time only)
- **Reconciliation**: Frontend trusts server state

## Testing Strategy

### Backend
- **Unit Tests**: Game logic, move validation
- **Integration Tests**: Full game flow with Testcontainers
- **Commands**:
  - `npm run test` - All tests
  - `npm run test:unit` - Unit tests only
  - `npm run test:integration` - Integration tests (requires Docker)

### Frontend
- **Unit Tests**: Utility functions, state management
- **Component Tests**: React components with Vitest
- **Manual Testing**: Full user flows in browser

## Deployment Considerations

### Environment Variables

**Backend** (`.env` in `packages/server/`)
```
PORT=3000
JWT_SECRET=<secret>
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_DATABASE=santorini
DB_PASSWORD=<password>
```

**Frontend** (`.env` in `packages/client-react/`)
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Build & Run

**Development**
```bash
# Backend
cd packages/server
npm run dev          # Port 3000

# Frontend
cd packages/client-react
npm run dev          # Port 5173
```

**Production**
```bash
# Backend
npm run build
npm start

# Frontend
npm run build        # Static files in dist/
```

## Completion Criteria

The system is considered **functionally complete** when:

### ✅ User Management
- [ ] User can register with username/password
- [ ] User can login and receive JWT token
- [ ] Authentication persists across page refreshes
- [ ] User can logout

### ✅ Game Creation & Joining
- [ ] User can create a new game
- [ ] User can see list of available games
- [ ] User can join an existing game
- [ ] Game shows all joined players in real-time

### ✅ Real-Time Updates
- [ ] WebSocket connection established after login
- [ ] Player joins are broadcast to all players in game
- [ ] Player ready status updates in real-time
- [ ] Game state changes broadcast to all players
- [ ] Move updates appear for all players instantly

### ✅ Game Start
- [ ] Players can set ready status
- [ ] Game starts when all players ready
- [ ] Game transitions to placing phase
- [ ] Current player receives available moves

### ✅ Worker Placement
- [ ] Current player can place workers on valid cells
- [ ] Invalid placements are rejected
- [ ] Turn switches after successful placement
- [ ] All players see worker placements in real-time
- [ ] Game transitions to playing phase after all workers placed

### ✅ Gameplay
- [ ] Current player can move worker to adjacent cell
- [ ] Current player can build after moving
- [ ] Invalid moves are rejected
- [ ] Turn switches after successful move+build
- [ ] All players see moves in real-time

### ✅ Win Condition
- [ ] Game detects when worker reaches level 3
- [ ] Game ends and declares winner
- [ ] All players notified of game end

### ✅ Error Handling
- [ ] Network errors show user-friendly messages
- [ ] WebSocket reconnection on disconnect
- [ ] Invalid moves show error feedback
- [ ] Authentication failures redirect to login

## Code Quality Standards

- **Minimal Code**: No over-engineering, simple solutions preferred
- **Idiomatic TypeScript**: Use language features appropriately
- **Type Safety**: Strict TypeScript, no `any` without justification
- **Error Handling**: Graceful degradation, user-friendly messages
- **Logging**: Structured logging for debugging
- **Comments**: Only for complex logic, code should be self-documenting

## Known Limitations

- No god powers implemented yet (core mechanics only)
- No game history/replay
- No spectator mode
- No chat functionality
- Single server instance (no horizontal scaling)
- No database connection pooling optimization

