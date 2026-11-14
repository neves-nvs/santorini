# Dev networking

`scripts/dev` starts Postgres, the server and the Vite dev server. The browser only ever talks to Vite (`:5174`); Vite forwards API and WebSocket traffic to the server (`:3000`), so every request is same-origin and needs no CORS.

```mermaid
flowchart LR
    Browser["Browser<br/>http://localhost:5174"]

    subgraph Vite["Vite dev server :5174"]
        Static["React app<br/>(HMR, static files)"]
        ApiProxy["proxy /api/*<br/>strip /api"]
        WsProxy["proxy /ws<br/>strip /ws, upgrade"]
    end

    subgraph Server["Express + ws :3000"]
        Rest["REST routes<br/>/users /session /me /games /token"]
        Ws["WebSocket server"]
    end

    DB[("Postgres :5432<br/>container santorini-postgres")]

    Browser -- "GET / , /src/*" --> Static
    Browser -- "fetch /api/users" --> ApiProxy
    Browser -- "ws://localhost:5174/ws?token=..." --> WsProxy
    ApiProxy -- "/users" --> Rest
    WsProxy -- "ws://localhost:3000/" --> Ws
    Rest --> DB
    Ws --> DB
```

## Request path

```mermaid
sequenceDiagram
    participant B as Browser (:5174)
    participant V as Vite proxy (:5174)
    participant S as Server (:3000)

    B->>V: POST /api/session (credentials: include)
    V->>S: POST /session
    S-->>V: 200 + Set-Cookie (JWT)
    V-->>B: 200 + Set-Cookie (same origin)

    B->>V: GET /api/token
    V->>S: GET /token (cookie)
    S-->>B: { token }

    B->>V: Upgrade ws://localhost:5174/ws?token=...
    V->>S: Upgrade ws://localhost:3000/?token=...
    S-->>B: 101 Switching Protocols
```

## Where it is configured

| Piece | File |
| --- | --- |
| Proxy rules (`/api`, `/ws`) | `packages/client-react/vite.config.ts` |
| Client base URL (`VITE_API_URL`) and WebSocket URL (`VITE_WS_URL`) | `packages/client-react/src/services/` |
| Server port (default 3000) | `packages/server/src/configs/config.ts` |
| Database container | `scripts/db-up` |

Docker uses the same shape: the nginx frontend container serves the build and proxies `/api` and `/ws` to the server container.
