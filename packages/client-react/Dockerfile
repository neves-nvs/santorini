# syntax=docker/dockerfile:1

# Build with scripts/docker-build (docker-bake.hcl): the shared package comes in as a named build context.
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app/packages/client-react
COPY package.json package-lock.json ./
RUN npm ci
COPY --from=shared . /app/packages/shared
COPY . ./
ENV VITE_API_URL=/api
ENV VITE_WS_URL=/ws
RUN npx vite build

FROM nginxinc/nginx-unprivileged:1-alpine
ENV BACKEND_URL=http://server:3000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/packages/client-react/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
