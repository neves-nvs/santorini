# syntax=docker/dockerfile:1
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global "$(node -p 'require("./package.json").packageManager')"
COPY packages/shared/package.json packages/shared/
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/
COPY packages/client-react/package.json packages/client-react/
RUN --mount=type=cache,id=santorini-pnpm,target=/pnpm/store \
  pnpm --store-dir=/pnpm/store --filter santorini-client-react... install --frozen-lockfile
COPY packages/engine packages/engine
COPY packages/shared packages/shared
COPY packages/client-react packages/client-react
ENV VITE_API_URL=/api
ENV VITE_WS_URL=/ws
RUN pnpm run build:client

FROM nginxinc/nginx-unprivileged:1-alpine
ENV BACKEND_URL=http://server:3000
COPY packages/client-react/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/packages/client-react/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
