# React Three Fiber Testing Setup

## Summary

The testing infrastructure has been upgraded to use the **official @react-three/test-renderer** library for testing React Three Fiber components.

## What Changed

### 1. Added Official Test Renderer

**Package**: `@react-three/test-renderer@^9.4.0`

This is the official testing library recommended by the React Three Fiber team. It provides:
- ✅ **No WebGL mocking needed** - Works in headless environments
- ✅ **Scene graph access** - Inspect the 3D scene structure  
- ✅ **Event firing** - Test click handlers and interactions
- ✅ **Frame advancement** - Test animations and frame-dependent behavior
- ✅ **Props inspection** - Check component properties

**Documentation**: https://r3f.docs.pmnd.rs/api/testing

### 2. Updated Test Utilities

**File**: `src/__tests__/helpers/r3f-test-utils.tsx`

Added new helper functions:
- `createR3FRenderer(element)` - Create test renderer for R3F components
- `advanceR3FFrames(renderer, frames, delta)` - Advance animation frames

Kept existing helpers for backward compatibility:
- `renderR3F()` - Render with React Testing Library + Canvas wrapper
- `mockWebGLContext()` - Mock WebGL for legacy tests
- `createMockGameState()`, `createMockBoardState()` - Mock data helpers

### 3. Created Example Tests

**File**: `src/__tests__/components/r3f/official-renderer.test.tsx`

Comprehensive example tests demonstrating:
- Basic rendering (mesh with geometry and material)
- Event handling (click events)
- Frame advancement (animations)
- Scene graph access (multiple objects, groups)
- Props inspection (material colors, geometry args)

**15 tests total** covering all major use cases.

## How to Use

### Installation

```bash
cd packages/client-react
npm install
```

This will install `@react-three/test-renderer` and all dependencies.

### Running Tests

```bash
# Run all tests
npm test

# Run only R3F tests
npm test -- official-renderer

# Run specific test file
npx vitest run src/__tests__/components/r3f/official-renderer.test.tsx
```

### Writing Tests

**Basic Example:**

```typescript
import { createR3FRenderer } from '../../helpers/r3f-test-utils'

function MyBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

it('should render a box', async () => {
  const renderer = await createR3FRenderer(<MyBox />)
  
  const mesh = renderer.scene.children[0]
  expect(mesh.type).toBe('Mesh')
  expect(mesh.allChildren.length).toBe(2) // geometry + material
})
```

**Testing Interactions:**

```typescript
function ClickableBox() {
  const [scale, setScale] = useState(1)
  
  return (
    <mesh scale={scale} onClick={() => setScale(scale + 0.5)}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}

it('should handle clicks', async () => {
  const renderer = await createR3FRenderer(<ClickableBox />)
  
  const mesh = renderer.scene.children[0]
  expect(mesh.props.scale).toBe(1)
  
  await renderer.fireEvent(mesh, 'click')
  expect(mesh.props.scale).toBe(1.5)
})
```

**Testing Animations:**

```typescript
it('should advance frames', async () => {
  const renderer = await createR3FRenderer(<AnimatedBox />)
  
  // Advance 60 frames at 60fps (1 second)
  await advanceR3FFrames(renderer, 60, 1/60)
  
  const mesh = renderer.scene.children[0]
  expect(mesh.props.rotation[1]).toBeGreaterThan(0)
})
```

## Testing Strategies

### 1. Official Test Renderer (Recommended)

Use for:
- Testing R3F component logic
- Testing interactions (clicks, hovers)
- Testing animations
- Testing scene graph structure

**Pros:**
- No WebGL mocking needed
- Fast execution
- Official support
- Scene graph access

**Cons:**
- Cannot test visual rendering
- Cannot test shaders/materials visually

### 2. React Testing Library + Canvas Wrapper

Use for:
- Testing components that mix HTML and R3F
- Testing hooks that use R3F context
- Integration tests

**Pros:**
- Tests full component tree
- Can test HTML + 3D together

**Cons:**
- Requires WebGL mocking
- Slower than test renderer
- Limited 3D inspection

### 3. Playwright E2E Tests

Use for:
- Visual regression testing
- Testing actual rendering
- Testing full user flows

**Pros:**
- Tests real rendering
- Tests in real browser
- Can capture screenshots

**Cons:**
- Slow execution
- Requires running dev server
- More complex setup

## Migration Guide

### From Custom Helpers to Official Renderer

**Before:**
```typescript
import { renderR3F, mockWebGLContext } from '../../helpers/r3f-test-utils'

beforeEach(() => {
  mockWebGLContext()
})

it('should render', () => {
  const { container } = renderR3F(<MyComponent />)
  expect(container).toBeTruthy()
})
```

**After:**
```typescript
import { createR3FRenderer } from '../../helpers/r3f-test-utils'

it('should render', async () => {
  const renderer = await createR3FRenderer(<MyComponent />)
  
  const mesh = renderer.scene.children[0]
  expect(mesh.type).toBe('Mesh')
})
```

### Key Differences

1. **Async/await required** - Test renderer is async
2. **Scene graph access** - Use `renderer.scene.children` instead of DOM queries
3. **Props inspection** - Use `mesh.props` instead of DOM attributes
4. **Event firing** - Use `renderer.fireEvent(object, 'click')` instead of `fireEvent`

## Next Steps

1. **Install dependencies**: Run `npm install` in `packages/client-react`
2. **Run example tests**: `npm test -- official-renderer`
3. **Write tests for existing components**: Start with `GamePieces.tsx`
4. **Migrate legacy tests**: Convert existing R3F tests to use official renderer

## Resources

- [Official R3F Testing Docs](https://r3f.docs.pmnd.rs/api/testing)
- [Test Renderer GitHub](https://github.com/pmndrs/react-three-fiber/tree/master/packages/test-renderer)
- [Example Tests](./src/__tests__/components/r3f/official-renderer.test.tsx)
- [Test Utilities](./src/__tests__/helpers/r3f-test-utils.tsx)
- [Testing Guide](./TESTING.md)

