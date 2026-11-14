# syntax=docker/dockerfile:1

# Build from this folder with `npm run docker-build`: the shared package comes in as a named build context.
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app/packages/server
COPY package.json package-lock.json ./
RUN npm ci
COPY --from=shared . /app/packages/shared
COPY . ./
RUN npm run build

FROM node:${NODE_VERSION}-slim AS production-dependencies
WORKDIR /app/packages/server
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:${NODE_VERSION}-slim
LABEL org.opencontainers.image.title="santorini-server" \
      org.opencontainers.image.source="https://github.com/neves-nvs/santorini"
WORKDIR /app/packages/server
ENV PORT=3000
COPY --from=production-dependencies /app/packages/server/node_modules ./node_modules
COPY --from=build /app/packages/server/dist ./dist
COPY package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/games').then(() => process.exit(0), () => process.exit(1))"
CMD ["node", "dist/server/src/main.js"]
