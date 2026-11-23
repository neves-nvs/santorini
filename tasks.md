# Frontend follow-up tasks

These findings were reviewed against the earlier `feat/game-screen-ux` work. This work is intentionally based on `origin/main` and should land as one reviewable PR per task, in order. Do not start the next task until the current PR has been opened.

## Queue

- [x] **1. Show a useful game result.** State who won and why, then give players a clear next action when the game ends. ([PR #185](https://github.com/neves-nvs/santorini/pull/185))
- [x] **2. Make connection recovery visible and recoverable.** Distinguish connecting, reconnecting, connected, and retry exhaustion; clear transient errors after recovery. ([PR #186](https://github.com/neves-nvs/santorini/pull/186))
- [x] **3. Fix mobile viewport and keyboard behavior.** Use dynamic viewport sizing for the app and board, and keep the auth form scrollable above the on-screen keyboard. ([PR #187](https://github.com/neves-nvs/santorini/pull/187))
- [ ] **4. Add an accessible alternative to 3D game input.** Provide keyboard and screen-reader operable actions that do not depend on clicking canvas meshes.
- [ ] **5. Simplify game client state.** Reduce duplicated derived state and make game changes/reset paths preserve one clear source of truth.
- [ ] **6. Establish consistent UI tokens and readable type.** Replace scattered page-level values where practical, and increase undersized player/status text.
- [ ] **7. Make connection status understandable without color alone.** Keep the compact player indicator while adding a visible non-color cue.
- [ ] **8. Expand responsive and browser review coverage.** Add mobile viewport and WebKit/Firefox coverage where supported, and define a screenshot review flow that does not commit image assets.

## Per-PR expectations

- Keep each PR scoped to one queue item. Add coverage in task 8; don't broaden earlier tasks into a test-infrastructure change.
- Capture visual evidence for UI changes in the PR discussion without leaving screenshots in the repository.
- Report checks run and known gaps in the PR description.
