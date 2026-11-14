# syntax=docker/dockerfile:1

# Build from the repository root: docker build -f packages/client-react/Dockerfile -t santorini-client .
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app/packages/client-react
COPY packages/client-react/package.json packages/client-react/package-lock.json ./
RUN npm ci
COPY packages/shared /app/packages/shared
COPY packages/client-react ./
ENV VITE_API_URL=/api
ENV VITE_WS_URL=/ws
RUN npx vite build

FROM nginx:1-alpine
LABEL org.opencontainers.image.title="santorini-client" \
      org.opencontainers.image.source="https://github.com/neves-nvs/santorini"
ENV BACKEND_URL=http://server:3000
COPY packages/client-react/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/packages/client-react/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
