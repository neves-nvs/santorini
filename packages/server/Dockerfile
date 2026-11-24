# syntax=docker/dockerfile:1
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Read the same exact pnpm version as local development and CI.
RUN npm install --global "$(node -p 'require("./package.json").packageManager')"
COPY packages/shared/package.json packages/shared/
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/
COPY packages/client-react/package.json packages/client-react/
RUN --mount=type=cache,id=santorini-pnpm,target=/pnpm/store \
  pnpm --store-dir=/pnpm/store --filter santorini-backend... install --frozen-lockfile
COPY packages/engine packages/engine
COPY packages/shared packages/shared
COPY packages/server packages/server
RUN pnpm run build:server

FROM gcr.io/distroless/nodejs${NODE_VERSION}-debian13:nonroot
WORKDIR /app
ENV PATH=/nodejs/bin:$PATH
ENV PORT=3000
ENV NODE_ENV=production
ENV NODE_OPTIONS=--enable-source-maps
COPY --from=build /app/packages/server/dist ./dist
COPY packages/server/package.json LICENSE ./
USER 65532:65532
ENTRYPOINT []
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/readyz').then((response) => process.exit(response.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/main.js"]
