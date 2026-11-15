# Repository guidelines

Santorini Online is a web version of the board game. `packages/server` is the Express API and WebSocket server, `packages/client-react` is the React and three.js client, `packages/shared` holds the types both use.

## Layout

- `packages/server/src`: `app.ts`, `main.ts` and `composition-root.ts` wire things up. `auth/`, `users/`, `middlewares/`, `configs/`, `websockets/` (the WebSocket server and `WsRouter`), `game/` (`domain` rules, `application` services, `infra` repository and connection manager, `transport` HTTP routes), `migrations/` (Kysely). ES modules: relative imports end in `.ts`.
- `packages/client-react/src`: `pages/`, `components/`, `hooks/`, `services/` (`ApiService`, `WebSocketClient`), `store/`. End-to-end tests are in `e2e/` (Playwright).
- `packages/shared/src`: `websocket-types.ts` and `game-types.ts`, the message and game shapes used by both sides.
- `docs/api/openapi.yaml` and `docs/api/asyncapi.yaml` describe the REST routes and the WebSocket messages. Change them together with the code.
- `scripts/`: the shell helpers below.

## Commands (from the repository root)

- `scripts/install` runs `npm ci` in every package. `scripts/install --if-needed` does it only where `node_modules` is out of date.
- `scripts/dev` starts Postgres, the server on :3000 and the client on :5174, installing missing dependencies first.
- `scripts/check [server|client|all]` runs the checks CI runs, quietly. The server integration tests need Docker.
- `scripts/e2e` runs the Playwright suite against a throwaway database, server and client. `scripts/smoke` checks the dev setup.
- `scripts/docker-check` builds both images and runs the stack through nginx. Run it after a dependency change.
- `scripts/format-file <file>` formats one file the way CI checks it.
- `scripts/worktree new|list|done` manages the task worktrees (see Git and pull requests).

## Style

- TypeScript with Prettier and ESLint. The `sort-imports` rule is on: imports with several members first, then single-member imports, each group sorted case-sensitively by first member.
- `camelCase` for functions, `PascalCase` for components and classes, `SCREAMING_SNAKE_CASE` for constants.
- Code explains itself through names and structure. Add a comment only for a "why" the code cannot show.

## Tests

- Vitest. Name specs `<feature>.test.ts`. Server unit tests are in `packages/server/tests/unit`, integration tests (Testcontainers, Docker needed) in `tests/integration`. Client unit tests are in `src/__tests__`.
- A fix comes with a test that fails without it. No per-test timeouts. Do not re-test libraries.
- The client's `npm run type-check` and `npm test` have known failures, so CI does not gate on them yet.

## Git and pull requests

- The project folder holds the main clone and one worktree per task: `santorini/main`, `santorini/<task>`. Keep `main` clean: do not edit files there or run `pull`, `checkout`, `reset` or `stash`. `git fetch` and `scripts/worktree` are fine.
- Start a task with `scripts/worktree new <task> <branch>`. It fetches, creates `santorini/<task>` from `origin/main` on a new branch (give it a conventional prefix such as `fix/` or `feat/`) and installs dependencies. Work in that folder. Never create worktrees under `.claude/`.
- When the owner says the pull request is merged, run `scripts/worktree done <task>`. It removes the worktree and the local branch, and the remote branch if it is still there, but only when the pull request is merged and the branch has nothing the pull request lacks. `scripts/worktree list` shows every worktree with its pull request.
- Small pull requests with short imperative commit subjects and a prefix (`fix:`, `feat:`, `test:`, `docs:`, `chore:`). Say what changed, what was checked and what was not.
- The owner merges, by squash. After a squash merge, rebase a stacked branch with `git rebase --onto origin/main <old base tip>`. Force-push only branches other than `main`, and with `--force-with-lease`.

## Environment

- `JWT_SECRET` is required outside development. The server also needs the `DB_*` settings (see `packages/server/.env.example`). Client keys start with `VITE_`.
