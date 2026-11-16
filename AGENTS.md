# Repository guidelines

Santorini Online is a web version of the board game. `packages/server` is the Express API and WebSocket server, `packages/client-react` is the React and three.js client, `packages/shared` holds the types both use.

## Layout

- `packages/server/src`: `app.ts`, `main.ts` and `composition-root.ts` wire things up. `auth/`, `users/`, `middlewares/`, `configs/`, `websockets/` (the WebSocket server and `WsRouter`), `game/` (`domain` rules, `application` services, `infra` repository and connection manager, `transport` HTTP routes), `migrations/` (Kysely). ES modules: relative imports end in `.ts`.
- `packages/client-react/src` is split by domain, then by role. `game/` is the board game (Board3D and the pieces, the game page, the debug tools in `view/debug`, the game store, the server-message handler, the WebSocket client), `user/` is who the player is (login page, the current-user store, user API), `shared/` has no domain (`pages/` for the home and not-found pages, `ui/`, `utils/`, the base REST `request`). Inside a domain: `model/` (state, types, selectors, constants, pure helpers), `update/` (what changes the model, such as `GameMessageHandler`), `services/` (network side effects) and `view/` (`pages/`, `components/`, `hooks/`). `App.tsx`, `main.tsx`, `pages/LobbyPage` (it lists games and logs out, so it needs both domains) and `debug/` (developer test panels) are the app shell. End-to-end tests are in `e2e/` (Playwright); unit tests are in `src/__tests__`, mirroring `src`.
- `packages/shared/src`: `websocket-types.ts`, `game-types.ts` and `rest-types.ts`, the message, game and HTTP request and response shapes used by both sides. It is the workspace package `@santorini/shared`, compiled to `dist`: export new modules from `src/index.ts`, import from `@santorini/shared`, and rebuild after a change (`npm run build` there, or `scripts/install --if-needed`).
- `docs/api/openapi.yaml` and `docs/api/asyncapi.yaml` describe the REST routes and the WebSocket messages. Change them together with the code.
- `scripts/`: the shell helpers below.

## Commands (from the repository root)

- The three packages are npm workspaces with one `package-lock.json` at the root: install and update dependencies from the root (`npm install <name> -w packages/server`), and run a package's scripts from its folder or with `npm run <script> -w packages/<name>`.
- `scripts/install` runs `npm ci` once at the root and builds `packages/shared`. `scripts/install --if-needed` does it only when `node_modules` is out of date, and rebuilds `shared` when its `dist` is missing or older than its sources.
- `scripts/dev` starts Postgres, the server on :3000, the client on :5174 and a watcher that rebuilds `packages/shared`, installing missing dependencies first.
- `scripts/check [shared|server|client|all]` runs the checks CI runs, quietly. The server integration tests need Docker.
- `scripts/e2e` runs the Playwright suite against a throwaway database, server and client. `scripts/smoke` checks the dev setup.
- `scripts/docker-check` builds both images and runs the stack through nginx. Run it after a dependency change.
- `scripts/format-file <file>` formats one file the way CI checks it.
- `scripts/worktree new|list|done` manages the task worktrees (see Git and pull requests).

## Style

- TypeScript with Prettier and ESLint. The `sort-imports` rule is on: imports with several members first, then single-member imports, each group sorted case-sensitively by first member.
- Client imports: `./` within a folder, `@/` (the `src` folder) across folders, `@santorini/shared` for the shared package. No `../`, and no `process.env` (use `import.meta.env`). Layers import downwards only: `shared` imports no domain, `user` imports `shared` only, `game` imports `shared` and `user/model`, and inside a domain `model` imports no other layer, `update` imports `model`, `services` import `model`, `view` imports all of them. The shell may import anything. ESLint enforces all of it.
- `camelCase` for functions, `PascalCase` for components and classes, `SCREAMING_SNAKE_CASE` for constants.
- Code explains itself through names and structure. Add a comment only for a "why" the code cannot show.

## Tests

- Vitest. Name specs `<feature>.test.ts`. Server unit tests are in `packages/server/tests/unit`, integration tests (Testcontainers, Docker needed) in `tests/integration`. Client unit tests are in `src/__tests__`.
- No per-test timeouts. Do not re-test libraries.
- The client's `npm test` has known failures, so CI does not gate on it yet. `npm run type-check` is gated.

## Definition of done

- Read what surrounds a change before planning it: its callers and tests, and, when behaviour or configuration changes, `docs/api`, `.env.example` and the README.
- A fix or feature starts with a test that fails for the right reason. Then implement until it passes.
- `scripts/check` passes. After a dependency, Dockerfile, compose or configuration change, `scripts/docker-check` passes too.
- Stay inside the task. A behaviour change beyond it is either left out or named in the pull request.
- The pull request says what changed, what was run, and what was not checked.

## Git and pull requests

- Work on each task in its own git worktree, so branches and installed dependencies do not collide. Keep the main clone on `main`.
- `scripts/worktree new <task> <branch>` fetches, creates `../<task>` next to the main clone from `origin/main` on a new branch (use a conventional prefix such as `fix/` or `feat/`) and installs dependencies.
- `scripts/worktree done <task>` removes the worktree and the local branch, and the remote branch if it is still there, once the pull request is merged and the branch has nothing the pull request lacks. `scripts/worktree list` shows every worktree with its pull request.
- Small pull requests with short imperative commit subjects and a prefix: `feat`, `fix`, `perf`, `revert`, `docs`, `style`, `chore`, `refactor`, `test`, `build` or `ci` (the types release-please knows).
- The pull request title is the squash commit subject, so it carries the prefix too: CI checks it (`pr-title.yml`). The repository allows only squash merges, with the title and description of the pull request as the commit message.
- The owner merges, by squash. After a squash merge, rebase a stacked branch with `git rebase --onto origin/main <old base tip>`. Force-push only branches other than `main`, and with `--force-with-lease`.

## Releases

- Versions are semver starting at `0.`: while the major is 0, any minor bump may break things. Move to `1.0.0` when the first stable deploy is running.
- The git tag is the only version source, and release-please creates it. It keeps one release pull request open with the next version and the `CHANGELOG.md` entry, built from the `feat:` and `fix:` commit prefixes (a breaking change bumps the minor while the major is 0). The owner merges that pull request to release. Never tag by hand. Tags `v*` cannot be moved or deleted (repository ruleset `release tags`).
- The workflow needs the secret `RELEASE_PLEASE_TOKEN`, a fine-grained personal access token limited to this repository with Contents and Pull requests read and write.
- CI pushes both images to `ghcr.io/neves-nvs/santorini-server` and `santorini-client`: every push to `main` that changes an image input gets the commit SHA as its tag, and a `v*.*.*` tag also gets the version without the `v` (for example `0.1.0`). There is no `latest`: deploys pin a version or a SHA.

## Environment

- `JWT_SECRET` is required outside development. The server also needs the `DB_*` settings (see `packages/server/.env.example`). Client keys start with `VITE_`.
