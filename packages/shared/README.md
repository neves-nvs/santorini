# @santorini/shared

The types and constants the server and the client agree on: game views, move commands and the WebSocket
messages. It has no runtime dependencies.

The server and the client depend on it with `"@santorini/shared": "file:../shared"` and import from
`@santorini/shared`. They get the compiled `dist`, so build it after changing `src`:

```bash
npm run build       # once
npm run dev         # rebuild on every change (scripts/dev does this for you)
npm run typecheck
```

`scripts/install` builds it after installing. `src/index.ts` is the only entry point: export new modules from there.
