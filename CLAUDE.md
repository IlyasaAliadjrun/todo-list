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

- **Fase 0 (Fondasi & Infrastruktur) — SELESAI.** Monorepo pnpm+Turborepo hidup,
  `GET /health` cek DB+Redis, CI + Docker siap.
- **Fase 1 (Auth & Workspace) — SELESAI.** Register/login/logout/refresh (argon2 +
  JWT access + refresh token opaque ter-hash & rotasi via cookie httpOnly, lihat
  ADR 0003), RBAC workspace (OWNER/ADMIN/MEMBER), workspace personal otomatis, buat
  workspace tim, undang/terima/kelola anggota, rate-limit login (Redis). Frontend:
  TanStack Router + guard, halaman auth, workspace switcher, panel anggota.
- **Fase 2 (Halaman & Hierarki) — SELESAI.** CRUD page bersarang, urutan sibling
  fractional index, move (re-parent + reorder) dengan cegah cycle, archive/restore
  + trash + hapus permanen cascade (lihat ADR 0004). Frontend: sidebar tree (@dnd-kit)
  drag reorder/re-parent, rename inline, set ikon emoji, PageDetail, halaman Trash.
- **Fase 3 (Block Editor BlockNote) — SELESAI.** Konten disimpan sebagai JSON block
  di `Page.content` (jsonb), autosave debounce 500ms last-write-wins, load saat buka
  halaman, upload gambar via presigned PUT ke MinIO/S3 (lihat ADR 0005). Frontend:
  editor BlockNote di PageDetail, indikator simpan, tema light/dark tersinkron.
- **Fase 4 (Database Sederhana) — SELESAI.** Model Database/Property/Row/CellValue,
  tipe TEXT/NUMBER/SELECT/MULTI_SELECT/CHECKBOX/DATE/URL, validasi nilai per tipe
  (`normalizeCellValue`), ganti tipe best-effort (lihat ADR 0006). Frontend: BlockNote
  custom block `/database` + TableView (CRUD kolom/baris, edit sel, opsi select,
  reorder kolom, sort & filter client-side). Juga fix proxy dev (/pages,/databases,dst).
- **Fase 5 (Kolaborasi Real-time) — SELESAI.** Server Hocuspocus (Yjs) di `/collab`
  pada HTTP server Nest, otorisasi koneksi per-dokumen (JWT + keanggotaan workspace),
  persistensi snapshot Yjs di `Page.yjsState`, `Page.content` JSON tetap snapshot
  (lihat ADR 0007). Frontend: BlockNote mode collaboration (HocuspocusProvider),
  presence cursor+nama, indikator Live/Offline, proxy ws Vite `/collab`.
- **Fase 6 (Sharing & Permission) — SELESAI.** `PagePermission` (USER/WORKSPACE,
  VIEW/COMMENT/EDIT), resolusi efektif dengan pewarisan+override (`resolveEffectiveLevel`,
  default EDIT kompatibel Fase 2, OWNER/ADMIN bypass), enforcement di REST page/database
  (≥VIEW baca, ≥EDIT tulis) + koneksi Yjs (read-only bila <EDIT), `myLevel` di detail
  (lihat ADR 0008). Frontend: dialog Bagikan + editor/judul read-only per level.
- **Fase 7 (Search, Favorites & Trash) — SELESAI.** Full-text search Postgres
  (`Page.searchText` + trigger `tsvector` + GIN, `ts_rank`/`ts_headline`, filter
  permission), Favorites (`Favorite`, `isFavorite` di detail), auto-purge trash cron
  (`@nestjs/schedule`, >30 hari) — lihat ADR 0009. Frontend: command palette Cmd/Ctrl+K
  (`cmdk`), section Favorit di sidebar, tombol bintang.
- **Fase 8 (Hardening & Deploy) — SELESAI (v1.0.0).** Keamanan: helmet, rate-limit global
  (throttler) + login RL Redis, batas payload. Observability: logging pino + `x-request-id`,
  probe `/health/live` & `/health/ready`. Robustness FE: error boundary + retry backoff.
  Deploy: `Dockerfile.prod` (api non-root, web Nginx) + `docker-compose.prod.yml` + service
  migrate. E2E Playwright (alur inti) + CI GitHub Actions (quality + e2e). Lihat
  `docs/deployment.md`.
- **v1 SELESAI.** Backlog fase 9+ ada di `docs/roadmap.md`.
- **Fase 9 (Multiple database views) — SELESAI.** View aktif per-database di-persist
  (`Database.viewType` + `groupBy/date/coverPropertyId`, lihat ADR 0010): **Board** (Kanban,
  group-by SELECT, drag antar kolom via @dnd-kit → `setCell`), **Gallery** (grid kartu +
  sampul URL opsional), **Calendar** (grid bulanan by properti DATE, +tambah baris per hari).
  Endpoint `PATCH /databases/:id/view` (≥EDIT, validasi tipe properti). Frontend: `DatabaseView`
  jadi container (switcher + selector konfigurasi) → `TableView`/`BoardView`/`GalleryView`/
  `CalendarView` + `RecordCard`. Helper murni `groupRowsByOption`/`bucketRowsByDate` (shared, diuji).

## Slash command tersedia (lihat .claude/commands/)

`/start-phase <n>` · `/finish-phase` · `/new-feature <deskripsi>` ·
`/db-migrate <deskripsi>` · `/review` · `/commit`
