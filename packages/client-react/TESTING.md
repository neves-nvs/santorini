# Testing Guide for Santorini React Client

This guide explains how to test the React Three Fiber frontend, including unit tests, E2E tests, and strategies for testing 3D components.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Unit Testing](#unit-testing)
3. [E2E Testing](#e2e-testing)
4. [Testing React Three Fiber Components](#testing-react-three-fiber-components)
5. [Test Helpers and Utilities](#test-helpers-and-utilities)
6. [Best Practices](#best-practices)

---

## Quick Start

```bash
# Run all unit tests
npm test

# Run unit tests with UI
npm run test:ui

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive)
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed
```

---

## Unit Testing

### Framework: Vitest + React Testing Library

Unit tests are located in `src/__tests__/` and use Vitest with jsdom environment.

### What's Tested

- ✅ **Services** (`ApiService`, `WebSocketService`)
- ✅ **State Management** (`gameStore`)
- ✅ **Utilities** (`errorHandler`, `performanceMonitor`)
- ✅ **Type Helpers** (`gameLifecycle`)
- ✅ **Board Logic** (`board-types`)

### Example: Testing a Service

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiService } from '../../services/ApiService'

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('should fetch games', async () => {
    const mockGames = [{ id: 1, name: 'Test Game' }]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGames,
    })

    const result = await apiService.getGames()
    expect(result).toEqual(mockGames)
  })
})
```

### Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- board-types

# Run tests in a specific file
npm test -- src/__tests__/services/ApiService.test.ts

# Run in watch mode
npm test -- --watch
```

---

## E2E Testing

### Framework: Playwright

E2E tests are located in `e2e/` and test the full application in a real browser.

### What's Tested

- ✅ **Authentication Flow** (login, registration)
- ✅ **Navigation** (routing, page loads)
- ✅ **UI Interactions** (forms, buttons)
- ✅ **Error Handling** (graceful degradation)

### Example: Testing Authentication

```typescript
import { test, expect } from '@playwright/test'

test('should login with credentials', async ({ page }) => {
  await page.goto('/auth')
  
  await page.locator('input[type="text"]').fill('testuser')
  await page.locator('input[type="password"]').fill('testpass')
  await page.getByRole('button', { name: /login/i }).click()
  
  await page.waitForTimeout(1000)
  expect(page.url()).toBeTruthy()
})
```

### Configuration

Playwright config is in `playwright.config.ts`:
- Auto-starts dev server on port 5174
- Uses Chromium browser
- Generates HTML reports

### Viewing Reports

```bash
# Open last test report
npx playwright show-report
```

---

## Testing React Three Fiber Components

### Challenge

React Three Fiber (R3F) components render 3D graphics using WebGL, which is difficult to test in a headless environment.

### Strategy

We use a **layered testing approach**:

1. **Unit test the logic** (board state, coordinates, game rules)
2. **Mock the 3D rendering** (use test helpers)
3. **E2E test the integration** (Playwright with real browser)

### Test Helpers

Located in `src/__tests__/helpers/r3f-test-utils.tsx`:

#### `renderR3F(component, options)`

Renders an R3F component with proper Canvas setup:

```typescript
import { renderR3F } from '../../helpers/r3f-test-utils'
import { Cell } from '../../../components/game/GamePieces'

it('should render a cell', () => {
  const { container } = renderR3F(
    <Cell position={[0, 0, 0]} gridX={0} gridZ={0} onClick={vi.fn()} />
  )
  
  expect(container).toBeTruthy()
})
```

#### `mockWebGLContext()`

Mocks WebGL for headless testing:

```typescript
import { mockWebGLContext } from '../../helpers/r3f-test-utils'

beforeEach(() => {
  mockWebGLContext()
})
```

#### `setupSTLMocks()`

Mocks STL file loading:

```typescript
import { setupSTLMocks } from '../../helpers/r3f-test-utils'

beforeAll(() => {
  setupSTLMocks()
})
```

#### Board State Helpers

```typescript
import {
  createMockBoardState,
  addWorkerToBoardState,
  addBuildingToBoardState,
} from '../../helpers/r3f-test-utils'

it('should add worker to board', () => {
  const board = createMockBoardState()
  const boardWithWorker = addWorkerToBoardState(board, 2, 3, 1, 1)
  
  expect(boardWithWorker[2][3].worker).toEqual({
    playerId: 1,
    workerId: 1,
  })
})
```

### Example: Testing Board Logic

```typescript
import { describe, it, expect } from 'vitest'
import { gridToWorldCoords, worldToGridCoords } from '../../../components/game/board-types'

describe('Coordinate Conversion', () => {
  it('should convert grid to world coordinates', () => {
    expect(gridToWorldCoords(0, 0)).toEqual([-2, -2])
    expect(gridToWorldCoords(2, 2)).toEqual([0, 0])
    expect(gridToWorldCoords(4, 4)).toEqual([2, 2])
  })

  it('should round-trip convert coordinates', () => {
    for (let gridX = 0; gridX < 5; gridX++) {
      for (let gridZ = 0; gridZ < 5; gridZ++) {
        const [worldX, worldZ] = gridToWorldCoords(gridX, gridZ)
        const [backToGridX, backToGridZ] = worldToGridCoords(worldX, worldZ)
        
        expect(backToGridX).toBe(gridX)
        expect(backToGridZ).toBe(gridZ)
      }
    }
  })
})
```

### What to Test in R3F Components

#### ✅ **DO Test:**
- Board state transformations
- Coordinate conversions
- Game logic (valid moves, win conditions)
- Click handlers and callbacks
- Component props and rendering logic
- State updates and re-renders

#### ❌ **DON'T Test:**
- Exact 3D positions (use E2E for visual testing)
- WebGL rendering details
- STL model loading (mock it)
- Three.js internals

---

## Test Helpers and Utilities

### Mock Game State

```typescript
import { createMockGameState } from '../../helpers/r3f-test-utils'

const gameState = createMockGameState({
  currentPlayer: 2,
  status: 'waiting',
})
```

### Mock 3D Click Events

```typescript
import { createMock3DClickEvent } from '../../helpers/r3f-test-utils'

const event = createMock3DClickEvent([1, 2, 3])
event.stopPropagation()
```

### Wait for R3F Frames

```typescript
import { waitForR3FFrames } from '../../helpers/r3f-test-utils'

it('should animate', async () => {
  renderR3F(<AnimatedComponent />)
  await waitForR3FFrames(10)
  // Check animation state
})
```

---

## Best Practices

### 1. **Separate Logic from Rendering**

Extract game logic into pure functions that can be tested without 3D rendering:

```typescript
// ✅ Good - testable logic
export const calculateValidMoves = (board, worker) => {
  // Pure function logic
}

// ❌ Bad - logic mixed with rendering
const Board3D = () => {
  // Complex logic inside component
}
```

### 2. **Use Test Helpers**

Always use the provided test helpers for R3F components:

```typescript
// ✅ Good
import { renderR3F, mockWebGLContext } from '../../helpers/r3f-test-utils'

// ❌ Bad
import { render } from '@testing-library/react'
```

### 3. **Mock External Dependencies**

Mock STL loading, WebSocket connections, and API calls:

```typescript
beforeEach(() => {
  setupSTLMocks()
  vi.clearAllMocks()
})
```

### 4. **Test User Interactions**

Focus on testing what users do, not implementation details:

```typescript
// ✅ Good
it('should select worker when clicked', () => {
  const handleClick = vi.fn()
  renderR3F(<Worker onClick={handleClick} />)
  // Simulate click
})

// ❌ Bad
it('should have correct mesh geometry', () => {
  // Testing Three.js internals
})
```

### 5. **Use E2E for Visual Testing**

Use Playwright for testing visual appearance and complex interactions:

```typescript
test('should display game board', async ({ page }) => {
  await page.goto('/game/123')
  await expect(page.locator('canvas')).toBeVisible()
})
```

### 6. **Keep Tests Fast**

- Mock heavy operations (STL loading, WebGL)
- Use `vi.fn()` for callbacks
- Avoid unnecessary `waitFor` calls

### 7. **Test Edge Cases**

```typescript
it('should handle out of bounds coordinates', () => {
  expect(() => gridToWorldCoords(-1, 0)).toThrow()
  expect(() => gridToWorldCoords(5, 0)).toThrow()
})
```

---

## Coverage Goals

Current coverage:
- **Unit Tests**: 159/179 passing (89%)
- **E2E Tests**: 8/8 passing (100%)

Target coverage:
- Services: 90%+
- State Management: 90%+
- Utilities: 95%+
- Board Logic: 95%+
- R3F Components: 70%+ (logic only)

---

## Troubleshooting

### WebGL Errors

If you see WebGL errors in tests:

```typescript
import { mockWebGLContext } from '../../helpers/r3f-test-utils'

beforeEach(() => {
  mockWebGLContext()
})
```

### STL Loading Errors

If STL files fail to load:

```typescript
import { setupSTLMocks } from '../../helpers/r3f-test-utils'

beforeAll(() => {
  setupSTLMocks()
})
```

### Canvas Not Rendering

Make sure you're using `renderR3F` instead of `render`:

```typescript
// ✅ Correct
import { renderR3F } from '../../helpers/r3f-test-utils'
const { container } = renderR3F(<MyComponent />)

// ❌ Wrong
import { render } from '@testing-library/react'
const { container } = render(<MyComponent />)
```

---

## Adding New Tests

### 1. Create Test File

```bash
# For unit tests
touch src/__tests__/components/MyComponent.test.tsx

# For E2E tests
touch e2e/my-feature.spec.ts
```

### 2. Write Test

```typescript
import { describe, it, expect } from 'vitest'

describe('MyComponent', () => {
  it('should do something', () => {
    expect(true).toBe(true)
  })
})
```

### 3. Run Test

```bash
npm test -- MyComponent
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Documentation](https://threejs.org/docs/)

