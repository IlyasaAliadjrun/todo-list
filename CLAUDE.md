# CLAUDE.md — Panduan Proyek (dibaca otomatis oleh Claude Code)

> File ini adalah memory proyek. Jaga tetap **ringkas & akurat** — isinya masuk ke
> context setiap sesi. Detail panjang taruh di `docs/`, bukan di sini.

## Apa yang kita bangun

Aplikasi pencatatan berbasis **block editor ala Notion** (fitur inti saja) untuk
pemakaian **pribadi & tim**. Prioritas: **scalable, robust, siap deploy**.

Fitur inti: auth + workspace, halaman bersarang, block editor, database sederhana,
kolaborasi real-time, sharing/permission, search/favorites/trash.

## Lingkungan

- **Instalasi & runtime target: Ubuntu 20.04 LTS.**
- Node 20/22 LTS lewat **nvm** (JANGAN dari apt). `pnpm` via `corepack enable`.
- Layanan data (Postgres, Redis, MinIO) **hanya lewat Docker**, bukan apt.
- Docker Compose **v2** (`docker compose`, bukan `docker-compose`).
- Lihat `docs/setup-ubuntu.md` untuk langkah lengkap.

## Stack (jangan diubah tanpa ADR)

- Monorepo: pnpm workspaces + Turborepo.
- Frontend `apps/web`: React + Vite + TypeScript, TanStack Router/Query, Zustand,
  Tailwind + shadcn/ui, **BlockNote** (editor), Yjs (state kolaboratif).
- Backend `apps/api`: NestJS + TypeScript, PostgreSQL + Prisma, Redis, Hocuspocus.
- Shared: `packages/shared` (tipe + skema Zod), `packages/db` (Prisma).
- Auth: JWT access + refresh token (httpOnly cookie), argon2.
- Storage: S3-compatible (MinIO lokal).
- Test: Vitest (unit), Playwright (E2E), Testcontainers (integration).

**Dua keputusan yang tidak boleh dilanggar:**
1. Block editor pakai **BlockNote** (jangan bangun dari nol).
2. Real-time pakai **Yjs/CRDT + Hocuspocus** (jangan sinkronisasi manual).

## Struktur repo

```
apps/web        # SPA React
apps/api        # NestJS API + server Hocuspocus
packages/shared # tipe & skema Zod bersama
packages/db     # Prisma schema, client, migrations
docs/           # arsitektur, konvensi, deploy, ADR
.claude/        # commands & konfigurasi Claude Code
```

## Perintah penting

```bash
pnpm install              # pasang dependency
pnpm dev                  # jalankan web + api (Turborepo)
pnpm build                # build semua paket
pnpm lint                 # eslint
pnpm typecheck            # tsc --noEmit di semua paket
pnpm test                 # unit + integration
pnpm test:e2e             # Playwright
pnpm db:migrate           # jalankan migration Prisma
pnpm db:studio            # buka Prisma Studio
docker compose up -d      # nyalakan postgres, redis, minio
```

## Konvensi (ringkas — detail di docs/conventions.md)

- TypeScript **strict**. Tidak ada `any` tanpa alasan tertulis.
- Validasi SEMUA input eksternal dengan **Zod** (skema di `packages/shared`).
- Bentuk respons error API seragam: `{ error: { code, message, details? } }`.
- Setiap fitur wajib disertai **test** dan penanganan error.
- Jangan hardcode secret. Config lewat env; perbarui `.env.example`.
- Commit pakai **prefix bertag kurung siku**: `[FEAT]`, `[FIX]`, `[IMP]`, `[REF]`,
  `[DOCS]`, `[CHORE]`, ... (mis. `[FEAT] tambah login`). Lihat docs/conventions.md.
- Branch: `feat/<ringkas>`, `fix/<ringkas>`. Satu PR = satu perubahan koheren.
- Otorisasi wajib dicek di SEMUA endpoint (termasuk koneksi WebSocket Yjs).

## Aturan kerja untuk Claude Code

- Kerjakan **satu fase per sesi**. Fase & scope ada di `docs/roadmap.md`.
- Sebelum kode besar: jelaskan singkat keputusan arsitektur.
- Keputusan arsitektur signifikan → tulis ADR baru di `docs/adr/`.
- Jangan menambah fitur di luar scope fase; catat sebagai backlog di roadmap.
- Di akhir tugas: `pnpm lint && pnpm typecheck && pnpm test`, lalu commit.
- Kalau ambigu: ambil asumsi paling wajar dan tuliskan asumsinya.

## Status saat ini

- **Fase 0 (Fondasi & Infrastruktur) — SELESAI.** Monorepo pnpm+Turborepo hidup
  (`apps/web`, `apps/api`, `packages/shared`, `packages/db`), `GET /health` cek
  DB+Redis, web menampilkan status, lint+typecheck+test lolos, CI + Docker siap.
- Fase berikutnya: **Fase 1 — Auth & Workspace**.
- Lihat `docs/roadmap.md` untuk daftar fase & kriteria selesai.

## Slash command tersedia (lihat .claude/commands/)

`/start-phase <n>` · `/finish-phase` · `/new-feature <deskripsi>` ·
`/db-migrate <deskripsi>` · `/review` · `/commit`
