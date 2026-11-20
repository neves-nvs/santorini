# Testing the client

Unit tests use Vitest with jsdom and Testing Library. End-to-end tests use Playwright. Run everything from `packages/client-react`.

## Commands

```bash
npm test                          # unit tests, watch mode
npx vitest run                    # unit tests once
npm test -- board-types           # only files matching a name
npm run test:coverage             # coverage report (text, json, html)
../../scripts/e2e                 # Playwright against a throwaway database, server and client
```

`npm run test:e2e` is the same as `scripts/e2e`. Running `npx playwright test` directly fails unless the server and client are already up on ports 3000 and 5174. `scripts/smoke` checks the dev setup.

CI runs `npm run lint`. `npm run type-check` and `npm test` still have known failures, so CI does not gate on them.

## Unit tests

- Specs live in `src/__tests__/`, mirroring `src/`, and are named `<feature>.test.ts`.
- `src/__tests__/setup.ts` mocks `WebSocket` and `fetch` globally and cleans up the DOM after each test.
- Test what a user or caller sees, not implementation details. A fix comes with a test that fails without it.
- Do not re-test libraries, and do not set per-test timeouts.

## Three.js components

Keep game logic in plain functions (`board-types.ts`, the store) and test those directly. Test the components that draw it with `@react-three/test-renderer`, which needs no WebGL:

```tsx
import { advanceR3FFrames, createR3FRenderer } from '../../helpers/r3f-test-utils'

it('handles a click', async () => {
  const renderer = await createR3FRenderer(<ClickableBox />)
  const mesh = renderer.scene.children[0]

  await renderer.fireEvent(mesh, 'click')

  expect(mesh.props.scale).toBe(1.5)
})
```

`advanceR3FFrames(renderer, frames, delta)` steps animations. The examples in `src/__tests__/components/r3f/official-renderer.test.tsx` cover rendering, events, frames, the scene graph and props.

`src/__tests__/helpers/r3f-test-utils.tsx` also has `renderR3F` (Testing Library inside a `Canvas`, for components that mix HTML and 3D, with `mockWebGLContext` and `setupSTLMocks` for headless runs) and mock builders for game and board state. Prefer the test renderer for new tests.

What a headless test cannot see: exact positions on screen, shaders, and STL model loading. Cover those with Playwright or leave them.

## End-to-end tests

Specs are in `e2e/`. The config in `playwright.config.ts` runs one worker, sequentially, in Chromium, and keeps traces, screenshots and video for failures. A global setup fails fast with a clear message when the stack is not running. Open the last report with `npx playwright show-report`.
