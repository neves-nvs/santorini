# @santorini/shared

The types and constants the server and the client agree on: game views, move commands and the WebSocket
messages. It uses the engine’s game primitives and zod schemas.

The repository is a pnpm workspace, so the server and the client depend on it with `"@santorini/shared": "workspace:*"` and
import from `@santorini/shared`. They get the compiled `dist`, so build it after changing `src`:

```bash
pnpm run build       # once
pnpm run dev         # rebuild on every change (scripts/dev does this for you)
pnpm run typecheck
```

`scripts/install` builds it after installing. `src/index.ts` is the only entry point: export new modules from there.
