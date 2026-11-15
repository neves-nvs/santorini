# syntax=docker/dockerfile:1

# Build from the repository root with scripts/docker-build (docker-bake.hcl). The packages are npm workspaces
# that share one lockfile, so the build stage installs from the root and builds packages/shared before the client.
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client-react/package.json packages/client-react/
RUN --mount=type=cache,target=/root/.npm npm ci -w packages/shared -w packages/client-react
COPY packages/shared packages/shared
RUN npm run build -w packages/shared
COPY packages/client-react packages/client-react
WORKDIR /app/packages/client-react
ENV VITE_API_URL=/api
ENV VITE_WS_URL=/ws
RUN npx vite build

FROM nginxinc/nginx-unprivileged:1-alpine
ENV BACKEND_URL=http://server:3000
COPY packages/client-react/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/packages/client-react/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
