# syntax=docker/dockerfile:1

# Build from the repository root with scripts/docker-build (docker-bake.hcl). The packages are npm workspaces
# that share one lockfile, so every stage starts with the workspace manifests and installs from the root.
# node_modules/@santorini/shared and @santorini/engine are links to packages/shared and packages/engine, which the final
# image therefore has to contain (built).
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/
COPY packages/client-react/package.json packages/client-react/

FROM manifests AS build
RUN --mount=type=cache,target=/root/.npm npm ci -w packages/shared -w packages/engine -w packages/server
COPY packages/engine packages/engine
RUN npm run build -w packages/engine
COPY packages/shared packages/shared
RUN npm run build -w packages/shared
COPY packages/server packages/server
RUN npm run build -w packages/server

FROM manifests AS production-dependencies
RUN --mount=type=cache,target=/root/.npm npm ci -w packages/server --omit=dev

FROM node:${NODE_VERSION}-slim
WORKDIR /app
ENV PORT=3000
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/engine/package.json packages/engine/package.json
COPY --from=build /app/packages/engine/dist packages/engine/dist
COPY --from=build /app/packages/server/dist packages/server/dist
COPY packages/server/package.json packages/server/package.json
WORKDIR /app/packages/server
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/readyz').then((response) => process.exit(response.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "dist/main.js"]
