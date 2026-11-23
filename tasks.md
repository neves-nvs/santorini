# Frontend follow-up tasks

These findings were reviewed against the earlier `feat/game-screen-ux` work. This work is intentionally based on `origin/main` and should land as one reviewable PR per task, in order. Do not start the next task until the current PR has been opened.

## Queue

- [x] **1. Show a useful game result.** State who won and why, then give players a clear next action when the game ends. ([PR #185](https://github.com/neves-nvs/santorini/pull/185))
- [x] **2. Make connection recovery visible and recoverable.** Distinguish connecting, reconnecting, connected, and retry exhaustion; clear transient errors after recovery. ([PR #186](https://github.com/neves-nvs/santorini/pull/186))
- [x] **3. Fix mobile viewport and keyboard behavior.** Use dynamic viewport sizing for the app and board, and keep the auth form scrollable above the on-screen keyboard. ([PR #187](https://github.com/neves-nvs/santorini/pull/187))
- [x] **4. Add an accessible alternative to 3D game input.** Provide keyboard and screen-reader operable actions that do not depend on clicking canvas meshes. ([PR #188](https://github.com/neves-nvs/santorini/pull/188))
- [x] **5. Simplify game client state.** Reduce duplicated derived state and make game changes/reset paths preserve one clear source of truth. ([PR #189](https://github.com/neves-nvs/santorini/pull/189))
- [x] **6. Establish consistent UI tokens and readable type.** Replace scattered page-level values where practical, and increase undersized player/status text. ([PR #190](https://github.com/neves-nvs/santorini/pull/190))
- [x] **7. Make connection status understandable without color alone.** Keep the compact player indicator while adding a visible non-color cue. ([PR #191](https://github.com/neves-nvs/santorini/pull/191))
- [ ] **8. Expand responsive and browser review coverage.** Add mobile viewport and WebKit/Firefox coverage where supported, and define a screenshot review flow that does not commit image assets.

## Per-PR expectations

- Keep each PR scoped to one queue item. Add coverage in task 8; don't broaden earlier tasks into a test-infrastructure change.
- Capture visual evidence for UI changes in the PR discussion without leaving screenshots in the repository.
- Report checks run and known gaps in the PR description.

### Browser and screenshot review

- `npm run test:e2e` runs the Playwright suite on desktop Chromium, mobile Chromium, desktop and mobile WebKit, and desktop Firefox.
- `npm run test:e2e:screenshots -w packages/client-react` starts the disposable test stack and saves auth, lobby, and game screenshots for each browser project under `packages/client-react/test-results/`.
- `test-results/` is git-ignored. Attach the generated screenshots to the pull request discussion for visual review; do not commit them.
