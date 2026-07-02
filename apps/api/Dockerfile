# Multi-stage build untuk API (NestJS). Context build = ROOT repo (lihat compose).
# Fase 0: image dev-ready. Optimasi produksi lebih lanjut = Fase 8.

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
# node_modules & dist di-exclude via .dockerignore; install terjadi di dalam image.
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @notion/db generate \
  && pnpm build --filter=@notion/api

FROM node:22-alpine AS run
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo ./
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
