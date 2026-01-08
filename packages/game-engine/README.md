# @santorini/game-engine

Core game engine for the Santorini board game. This package contains the pure game logic, rules enforcement, and extensible god powers system, completely independent of any backend infrastructure.

## Features

- **Pure Game Logic**: Board state management, move generation, and win condition checking
- **Extensible God Powers**: Hook-based system for adding custom game rules
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Framework Agnostic**: No dependencies on databases, HTTP servers, or other infrastructure
- **Comprehensive Testing**: Full test coverage for all game mechanics

## Installation

```bash
npm install @santorini/game-engine
```

## Quick Start

```typescript
import { GameEngine, createEmptyBoard, GameContext } from '@santorini/game-engine';

// Create a new game engine
const engine = new GameEngine();

// Set up game context
const context: GameContext = {
  gameId: 1,
  currentPhase: 'placing',
  currentPlayerId: 1,
  boardState: createEmptyBoard(),
  playerCount: 2
};

// Generate available moves
const availableMoves = engine.generateAvailablePlays(context);
```

## Core Concepts

### Board State
The game board is represented as a 5x5 grid with building heights, domes, and worker positions.

### Game Phases
- **Placing**: Players place their workers on the board
- **Moving**: Players move their workers to adjacent cells
- **Building**: Players build blocks or domes after moving

### God Powers
Extensible system for modifying game rules through hooks that can:
- Modify available moves for each phase
- Add custom win conditions
- Validate moves with special rules
- Modify turn flow

## API Reference

See the TypeScript definitions for complete API documentation.
