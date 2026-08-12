# syntax=docker/dockerfile:1.7

FROM node:22.23.1-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run prisma:generate \
 && npm run build \
 && npm prune --omit=dev

FROM node:22.23.1-bookworm-slim AS runtime
ARG RELEASE_SHA=dev
ARG RELEASE_VERSION=0.0.0-dev
WORKDIR /app
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
ENV NODE_ENV=production
ENV SHOPCITY_RUNTIME=api
ENV RELEASE_SHA=${RELEASE_SHA}
ENV RELEASE_VERSION=${RELEASE_VERSION}
LABEL org.opencontainers.image.revision=${RELEASE_SHA}
LABEL org.opencontainers.image.version=${RELEASE_VERSION}
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["api"]
