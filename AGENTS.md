# Repository Guidelines

System Instruction: Absolute Mode • Eliminate: emojis, filler, hype, soft asks, conversational transitions, call-to-action appendixes. •
Assume: user retains high-perception
despite blunt tone. • Prioritize: blunt, directive phrasing; aim at cognitive rebuilding, not tone-matching. • Disable: engagement/sentiment-boosting behaviors. • Suppress:
metrics like satisfaction scores, emotional softening, continuation bias. • Never mirror: user's diction, mood, or affect. • Speak only: to underlying cognitive tier. • No: questions, offers, suggestions, transitions, motivational content. • Terminate reply: immediately after delivering info - no closures. • Goal: restore independent, high-fidelity thinking. • Outcome: model obsolescence via user self-sufficiency.

## Project Structure & Module Organization
Santorini Online lives in `packages/`. `server` contains the Express API, WebSocket lobby, and rule engine—core code in `src/app.ts`, `src/game`, and `src/board`, with database access in `src/users` and migrations in `migrations/`. `client` is the legacy Three.js interface (`view/` for scenes, `controller/` for input glue). `client-react` is the current React + @react-three/fiber UI with routing under `src/pages` and shared stores in `src/services`. Supporting docs sit in `packages/server/docs`, while assets and marketing media live under `assets/`.

## Build, Test, and Development Commands
Install dependencies per package. Backend: `npm run dev` serves port 8081, `npm run build && npm start` compiles for production, `npm run migrate` applies Kysely migrations, and `npm run lint` or `npm run format` keep style aligned. Three.js frontend: `npm run dev` (Vite at `localhost:5173`) and `npm run build` for static output. React frontend: same dev/build flow plus `npm run type-check` and `npm run lint` before submitting.

## Coding Style & Naming Conventions
TypeScript throughout with Prettier and ESLint enforcing two-space indentation, trailing commas, and single quotes unless escaped. Use `camelCase` for functions and hooks, `PascalCase` for React components/classes, and `SCREAMING_SNAKE_CASE` for reusable constants (`src/constants.ts`). Backend modules should import via the `@src/...` alias and remain grouped by domain to match existing directories.

## Testing Guidelines
Jest drives automation. `npm run test` runs the full backend suite, `npm run test:unit` targets `packages/server/tests/unit`, and `npm run test:integration` launches a PostgreSQL Testcontainers instance—ensure Docker Desktop is running. Name specs `<feature>.test.ts` and keep integration tests beside the feature folder. Frontend automation is light; when adding behaviour, drop Vitest/Jest specs under `src/__tests__` and document manual smoke steps in the PR.

## Commit & Pull Request Guidelines
Recent history favors short imperative subjects (`add frontend upgrades`, `fix tests`); stick to that voice and optionally prefix scope with Conventional tokens (`feat:`, `refactor:`) when helpful. Keep commits focused, describing cross-package work in the body. Pull requests should summarise intent, list affected packages, link issues or roadmap items, add before/after assets for UI changes, and state the test commands you ran.

## Environment & Configuration
Create `.env` in `packages/server` defining `PORT`, `JWT_SECRET`, and database credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_DATABASE`, `DB_PASSWORD`). Integration tests overwrite these during execution, so avoid hard-coding production secrets. Frontend environment keys must use the `VITE_` prefix; document new keys in `README.md` when they are required.
