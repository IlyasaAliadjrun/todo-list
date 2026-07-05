# My Notepad

Aplikasi pencatatan berbasis **block editor** ala Notion (fitur inti) untuk pemakaian
pribadi & tim. Monorepo scalable, robust, dan siap deploy.

> **Status:** Fase 2 (Halaman & Hierarki) selesai. Roadmap lengkap di
> [`docs/roadmap.md`](docs/roadmap.md).

## Stack

| Lapisan   | Teknologi                                                                      |
| --------- | ------------------------------------------------------------------------------ |
| Monorepo  | pnpm workspaces + Turborepo                                                     |
| Web       | React + Vite + TypeScript, TanStack Query, Tailwind + shadcn/ui                 |
| API       | NestJS + TypeScript, Prisma (PostgreSQL), ioredis                               |
| Shared    | `@notion/shared` (tipe + skema Zod), `@notion/db` (Prisma)                      |
| Infra dev | Docker Compose: PostgreSQL, Redis, MinIO (S3-compatible)                        |

Dua keputusan yang dikunci: editor pakai **BlockNote** (Fase 3), real-time pakai
**Yjs + Hocuspocus** (Fase 5). Lihat [`docs/architecture.md`](docs/architecture.md).

## Struktur

```
apps/web         # SPA React (Vite)
apps/api         # NestJS API (+ Hocuspocus mulai Fase 5)
packages/shared  # tipe & skema Zod bersama
packages/db      # Prisma schema, client, migrations
docs/            # arsitektur, konvensi, roadmap, ADR
```

## Prasyarat (Ubuntu 20.04 LTS)

- **Node 20/22 LTS via nvm** (JANGAN dari apt), `corepack enable` untuk pnpm.
- **Docker Engine + Compose v2** dari repo resmi Docker (gunakan `docker compose`).
- Layanan data (Postgres/Redis/MinIO) **hanya lewat Docker**.

Cek prasyarat & siapkan `.env`:

```bash
bash scripts/setup-ubuntu.sh --env
```

Detail langkah instalasi: [`docs/setup-ubuntu.md`](docs/setup-ubuntu.md).

## Menjalankan dari nol

```bash
# 1. Siapkan env
cp .env.example .env            # atau: bash scripts/setup-ubuntu.sh --env

# 2. Nyalakan layanan data (postgres, redis, minio + bucket)
docker compose up -d postgres redis minio minio-init

# 3. Pasang dependency
pnpm install

# 4. Terapkan migration database (membuat schema history Prisma)
pnpm db:migrate

# 5. Jalankan web + api (Turborepo)
pnpm dev
```

Buka <http://localhost:5173> — halaman menampilkan **Status Sistem** yang memanggil
`GET /health` dan menunjukkan status `ok` bila Database & Redis tersambung.

### Menjalankan seluruh stack via Docker

```bash
docker compose up -d --build       # postgres, redis, minio, api, web
curl http://localhost:3001/health  # -> {"status":"ok",...}
```

- Web: <http://localhost:5173> · API: <http://localhost:3001> · MinIO console:
  <http://localhost:9001>

## Perintah penting

```bash
pnpm dev          # web + api (dev, watch)
pnpm build        # build semua paket (Turborepo)
pnpm lint         # eslint semua paket
pnpm typecheck    # tsc --noEmit semua paket
pnpm test         # unit test (Vitest)
pnpm db:migrate   # buat/terapkan migration Prisma (dev)
pnpm db:studio    # buka Prisma Studio
pnpm format       # Prettier tulis
```

## Konvensi & kontribusi

- TypeScript **strict**; validasi input eksternal dengan **Zod** (skema di
  `packages/shared`). Bentuk error API seragam: `{ error: { code, message, details? } }`.
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, …). Husky menjalankan
  lint + typecheck pre-commit dan commitlint pada commit-msg.
- Detail lengkap: [`docs/conventions.md`](docs/conventions.md).

## Catatan lingkungan

Ubuntu 20.04 sudah masuk fase ESM (standard support berakhir). Aktifkan Ubuntu
Pro/ESM untuk update keamanan, atau rencanakan upgrade ke 22.04/24.04. Semua layanan
stateful berjalan di container agar reproducible; host cukup menjalankan Node + Docker.
