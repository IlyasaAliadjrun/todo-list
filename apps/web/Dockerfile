# Multi-stage build untuk web (React + Vite). Context build = ROOT repo.
# Fase 0: dilayani via `vite preview` (dengan proxy ke API). Nginx/prod = Fase 8.

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build --filter=@notion/web

FROM node:22-alpine AS run
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo ./
WORKDIR /repo/apps/web
EXPOSE 5173
CMD ["pnpm", "preview", "--host", "0.0.0.0", "--port", "5173"]
