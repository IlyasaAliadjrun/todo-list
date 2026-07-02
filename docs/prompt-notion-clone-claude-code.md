# Blueprint Prompt: Membangun "Notion-Clone" SPA dengan Claude Code

Dokumen ini berisi kumpulan prompt siap-tempel yang dibagi per fase. Kerjakan **satu fase per sesi Claude Code**, review + commit + test di akhir tiap fase sebelum lanjut. Jangan gabung banyak fase dalam satu prompt — itu justru menurunkan kualitas output.

---

## 0. Ringkasan Produk (paham dulu sebelum ngoding)

Aplikasi pencatatan berbasis **block editor** ala Notion untuk kebutuhan **pribadi maupun tim**. Fitur inti saja (bukan seluruh Notion):

- Autentikasi + workspace (personal & team)
- Halaman bersarang (nested pages) dengan sidebar tree
- Block editor: teks kaya, heading, list, to-do, toggle, quote, callout, code, divider, image
- Slash command, drag-and-drop block, keyboard shortcut
- Database sederhana (tampilan tabel + properti dasar)
- Kolaborasi tim: sharing, permission, real-time editing
- Search, favorites, trash/restore
- Siap deploy (Docker, CI, env config, observability dasar)

---

## 1. Rekomendasi Stack (scalable, robust, deploy-ready)

Tempelkan bagian ini sebagai konteks awal ke Claude Code. Kalau Anda ingin lebih cepat, ada jalur alternatif (Supabase) di catatan bawah.

**Struktur & tooling**
- Monorepo: `pnpm` workspaces + Turborepo (`apps/web`, `apps/api`, `packages/shared`, `packages/db`)
- TypeScript strict mode di seluruh repo
- ESLint + Prettier + Husky (pre-commit) + Commitlint

**Frontend (`apps/web`)**
- React + TypeScript + Vite
- TanStack Router (routing) + TanStack Query (server state) + Zustand (client state ringan)
- Tailwind CSS + shadcn/ui (komponen)
- **BlockNote** untuk block editor (jangan bikin dari nol)
- Yjs untuk state kolaboratif dokumen

**Backend (`apps/api`)**
- NestJS + TypeScript (modular, cocok untuk skala) — alternatif ringan: Fastify
- PostgreSQL + Prisma (ORM, migrations)
- Redis (cache, session, rate limit)
- Hocuspocus (server Yjs untuk real-time collaboration)
- Zod untuk validasi input, dibagi ke `packages/shared`

**Auth & Storage**
- JWT access token + refresh token (httpOnly cookie), argon2 untuk hashing
- Object storage S3-compatible (MinIO lokal / S3 / R2) untuk upload gambar

**Infra & deploy**
- Docker + docker-compose (postgres, redis, minio, api, web) untuk dev & prod
- GitHub Actions: lint → typecheck → test → build → (opsional) deploy
- Deploy target: Fly.io / Railway / VPS untuk API; Vercel/Netlify atau container yang sama untuk web
- Observability dasar: structured logging (pino), health check, error tracking (Sentry opsional)

**Testing**
- Vitest (unit) + Playwright (E2E) + Testcontainers untuk integration test DB

> **Catatan jalur cepat (opsional):** Jika ingin memangkas waktu backend, ganti stack backend dengan **Supabase** (Postgres + Auth + Realtime + Storage terkelola). Frontend dan editor tetap sama. Trade-off: lebih cepat jalan, tapi kontrol/portabilitas lebih rendah. Pilih **satu jalur** dan konsisten sepanjang proyek.

> **Dua keputusan yang jangan dilanggar:**
> 1. Block editor pakai **BlockNote** (bukan dibangun manual).
> 2. Real-time pakai **Yjs/CRDT + Hocuspocus** (bukan sinkronisasi buatan sendiri).

### Catatan Lingkungan: Ubuntu 20.04 LTS (Focal)

Semua instalasi dan runtime ditargetkan ke **Ubuntu 20.04**. Beberapa penyesuaian penting karena paket bawaan distro ini sudah tua:

- **Node.js JANGAN dari `apt`** (versinya terlalu lama untuk Vite/NestJS/BlockNote). Pasang Node 20 atau 22 LTS lewat **nvm** (disarankan) atau NodeSource. Aktifkan **corepack** untuk `pnpm` (`corepack enable`).
- **Layanan data (Postgres, Redis, MinIO) dijalankan lewat Docker**, bukan `apt install`. Ini menghindari versi usang dan masalah kompatibilitas. Postgres 15/16 sebagai image, bukan paket distro.
- **Docker Engine + plugin Docker Compose v2** dipasang dari repositori resmi Docker (bukan `docker.io` dari apt yang lama). Gunakan sintaks `docker compose` (v2), bukan `docker-compose` (v1).
- **glibc 2.31**: sebagian prebuilt binary modern butuh glibc lebih baru. Menjalankan API/worker di dalam **container berbasis image Node resmi** menghindari masalah ini di host 20.04.
- **Playwright (Fase 8)**: jalankan `npx playwright install-deps` untuk memasang dependency sistem; di 20.04 beberapa lib butuh dipasang manual — dokumentasikan di README.
- **Support status**: standard support Ubuntu 20.04 sudah berakhir (kini fase ESM). Untuk keamanan jangka panjang, aktifkan **Ubuntu Pro/ESM** untuk update keamanan, atau catat rencana upgrade ke 22.04/24.04 sebagai backlog. Tulis ini di runbook.
- **Prinsip umum**: host 20.04 cukup untuk Node + Docker saja; semua service stateful hidup di container agar reproducible dan tidak bergantung paket lama di host.

---

## 2. Cara Memakai Prompt Ini

1. Mulai sesi Claude Code baru di folder proyek untuk **tiap fase**.
2. Tempel **"Konteks Global"** (bagian di bawah) di awal setiap sesi baru, lalu tempel prompt fase yang sedang dikerjakan.
3. Di akhir fase, minta Claude Code menulis/menjalankan test dan membuat commit. **Baru lanjut fase berikut** setelah semua kriteria selesai terpenuhi.
4. Kalau output menyimpang, koreksi lewat instruksi kecil — jangan lompat fase.

### Konteks Global (tempel di awal SETIAP sesi)

```
Kamu adalah senior full-stack engineer yang membangun aplikasi pencatatan berbasis
block-editor ala Notion (fitur inti saja) untuk pemakaian pribadi & tim. Prioritas:
kode scalable, robust, dan siap deploy.

Lingkungan target: SEMUA instalasi & runtime dilakukan di Ubuntu 20.04 LTS (Focal).
Ikuti catatan lingkungan Ubuntu 20.04 (Node via nvm/NodeSource bukan apt, layanan
data lewat Docker, dsb.) yang ada di bagian stack.

Aturan kerja:
- TypeScript strict. Tidak ada `any` tanpa alasan yang ditulis.
- Ikuti stack yang sudah disepakati (monorepo pnpm+Turborepo, React+Vite, NestJS,
  PostgreSQL+Prisma, Redis, BlockNote, Yjs+Hocuspocus, Tailwind+shadcn/ui).
- Setiap fitur: sertakan validasi input (Zod), penanganan error, dan test.
- Jelaskan keputusan arsitektur singkat sebelum menulis kode besar.
- Jangan meng-hardcode secret. Semua config lewat env + file .env.example.
- Di akhir tugas: jalankan lint + typecheck + test, lalu buat commit yang deskriptif.
- Kalau ada keputusan ambigu, buat asumsi paling wajar dan tuliskan asumsinya.

Kita bekerja per fase. Kerjakan HANYA fase yang aku berikan di pesan ini.
```

---

## FASE 0 — Fondasi Proyek & Infrastruktur Dev

**Tujuan:** kerangka monorepo yang bisa jalan, terkonfigurasi, dan siap dikembangkan.

```
FASE 0 — Fondasi & Infrastruktur.

Target lingkungan: Ubuntu 20.04 LTS. Sertakan skrip/panduan setup host di README:
- Pasang Node 20/22 LTS via nvm (JANGAN dari apt), aktifkan corepack untuk pnpm.
- Pasang Docker Engine + plugin Docker Compose v2 dari repo resmi Docker (pakai
  perintah `docker compose`, bukan `docker-compose` v1).
- Semua layanan data (postgres, redis, minio) hanya lewat Docker, bukan apt.
- Buat skrip bootstrap (mis. scripts/setup-ubuntu.sh) yang mengecek versi Node,
  pnpm, dan Docker, lalu memberi instruksi jika belum sesuai.

Buat monorepo dengan pnpm workspaces + Turborepo berisi:
- apps/web  (React + Vite + TypeScript, Tailwind + shadcn/ui terpasang)
- apps/api  (NestJS + TypeScript)
- packages/shared (tipe & skema Zod dipakai bersama web/api)
- packages/db  (Prisma schema + client + migrations)

Wajib:
1. TypeScript strict di semua paket, path alias rapi.
2. ESLint + Prettier + Husky pre-commit + Commitlint.
3. docker-compose.yml untuk dev: postgres, redis, minio (S3-compatible),
   ditambah service api & web. Sertakan .env.example lengkap.
4. Prisma tersambung ke Postgres; buat migration awal kosong yang berhasil jalan.
5. Health check endpoint di API (GET /health) yang cek koneksi DB & Redis.
6. Halaman web placeholder yang memanggil /health dan menampilkan status.
7. Skrip root: dev, build, lint, typecheck, test (via Turborepo).
8. README dengan langkah menjalankan proyek dari nol.
9. GitHub Actions: lint → typecheck → build (test menyusul di fase berikut).

Kriteria selesai:
- `pnpm install && docker compose up` menyalakan seluruh stack.
- `pnpm dev` menyalakan web+api, web berhasil menampilkan status health "ok".
- lint, typecheck lolos. Buat commit.
```

---

## FASE 1 — Autentikasi & Workspace

**Tujuan:** user bisa daftar/login, punya workspace personal, dan bisa membuat workspace tim.

```
FASE 1 — Auth & Workspace.

Model data (Prisma): User, Session/RefreshToken, Workspace, WorkspaceMember (role:
OWNER/ADMIN/MEMBER). Setiap user baru otomatis punya 1 workspace personal.

Backend (NestJS):
- Register (email+password, argon2), login, logout, refresh token.
- Access token JWT singkat + refresh token httpOnly cookie + rotasi refresh token.
- Guard/middleware auth, decorator @CurrentUser, RBAC dasar berbasis role workspace.
- Endpoint: buat workspace tim, list workspace milik user, undang anggota (stub email
  dulu: buat token undangan yang bisa di-accept), ganti/hapus anggota.
- Rate limiting login (Redis). Validasi input Zod. Error handling konsisten (bentuk
  respons error seragam).

Frontend (React):
- Halaman register, login, logout. Simpan sesi via cookie + TanStack Query.
- Route guard (redirect ke login jika belum auth).
- Workspace switcher di UI (dropdown), halaman pengaturan anggota workspace.

Test:
- Unit test service auth (hash, refresh rotation).
- Integration test alur register→login→refresh→logout (Testcontainers Postgres).

Kriteria selesai: user bisa daftar, login, membuat workspace tim, mengundang &
mengelola anggota. Test lolos. Commit.
```

---

## FASE 2 — Halaman & Hierarki (Sidebar Tree)

**Tujuan:** CRUD halaman bersarang + sidebar navigasi ala Notion (belum masuk editor block).

```
FASE 2 — Pages & Nested Hierarchy.

Model: Page (id, workspaceId, parentId nullable, title, icon, coverUrl, order,
createdBy, isArchived, timestamps). Simpan urutan antar-saudara (mis. kolom `order`
fractional index untuk drag-reorder murah).

Backend:
- CRUD Page dengan otorisasi: hanya anggota workspace terkait.
- Endpoint tree: ambil struktur halaman workspace (untuk sidebar), pindah halaman
  (ubah parent + reorder), archive/restore.
- Cegah cycle saat memindahkan halaman ke turunannya sendiri.

Frontend:
- Sidebar tree: expand/collapse, buat sub-page, drag untuk reorder & re-parent,
  rename inline, set icon (emoji), hapus (→ trash).
- Halaman detail sementara menampilkan title yang bisa diedit + area konten kosong
  (placeholder editor untuk Fase 3).
- Optimistic update via TanStack Query.

Test: integration CRUD + guard workspace + proteksi cycle. Commit.
```

---

## FASE 3 — Block Editor Inti (BlockNote)

**Tujuan:** jantung aplikasi — editor block yang tersimpan dan ter-load per halaman.

```
FASE 3 — Block Editor (BlockNote).

Integrasikan BlockNote sebagai editor konten per halaman. JANGAN membangun editor
block dari nol.

Fitur block yang harus jalan:
- Paragraph, Heading 1-3, bulleted/numbered list, checklist (to-do), toggle, quote,
  callout, code block, divider, image (upload).
- Rich text: bold, italic, underline, strikethrough, inline code, link, warna teks.
- Slash command untuk menyisipkan block.
- Drag handle untuk memindah block; shortcut keyboard standar.

Penyimpanan:
- Simpan dokumen sebagai JSON block BlockNote di kolom Page.content (jsonb).
- Autosave debounce (mis. 500ms) ke backend; tampilkan indikator "saving/saved".
- Load konten saat membuka halaman.

Upload gambar:
- Endpoint presigned upload ke MinIO/S3; validasi tipe & ukuran; kembalikan URL.

Test: autosave (debounce, konflik simpan terakhir menang untuk sekarang),
serialisasi/deserialisasi konten, upload gambar (mock storage). Commit.
```

---

## FASE 4 — Database Sederhana (Tampilan Tabel)

**Tujuan:** fitur "database" Notion versi minimal untuk pencatatan terstruktur.

```
FASE 4 — Simple Databases (Table View).

Model: Database (milik Page/workspace), Property (name, type), Row, CellValue.
Tipe properti minimal: text, number, select (opsi), multi-select, checkbox, date,
url. (Cukup ini dulu; relation/rollup di luar scope.)

Backend:
- CRUD database, properti (tambah/edit/hapus/urutkan kolom), row, dan nilai sel.
- Validasi nilai sesuai tipe properti (Zod). Otorisasi via workspace.

Frontend:
- Block "database" yang bisa disisipkan di halaman.
- Table view: tambah/hapus baris & kolom, edit sel inline, ubah tipe kolom, kelola
  opsi select. Sorting & filter dasar (client-side dulu).

Test: validasi tipe sel, CRUD kolom/baris. Commit.
```

---

## FASE 5 — Kolaborasi Real-time (Yjs + Hocuspocus)

**Tujuan:** beberapa orang mengedit halaman yang sama secara bersamaan.

```
FASE 5 — Real-time Collaboration.

Pakai Yjs (CRDT) + Hocuspocus. JANGAN membuat sinkronisasi manual.

Backend:
- Server Hocuspocus (bisa sebagai modul di apps/api atau service terpisah).
- Autentikasi koneksi WebSocket via token; otorisasi per-document (hanya anggota
  workspace yang berhak yang boleh connect ke doc tsb).
- Persistensi Yjs doc: simpan snapshot ke Postgres secara berkala + saat idle,
  rekonsiliasi dengan Page.content.

Frontend:
- Hubungkan BlockNote ke provider Yjs. Tampilkan presence: cursor & nama peserta
  aktif, indikator "user X sedang mengedit".
- Tangani offline/reconnect dengan baik (queue perubahan, resync saat online).

Test: dua klien mengedit doc yang sama konvergen ke state yang sama (integration).
Otorisasi koneksi ditolak untuk non-anggota. Commit.
```

---

## FASE 6 — Sharing, Permission & Kolaborasi Tim

**Tujuan:** kontrol akses halaman untuk kerja tim.

```
FASE 6 — Sharing & Permissions.

Model: PagePermission (pageId, subject: user/workspace, level: VIEW/COMMENT/EDIT).
Warisi permission ke sub-page kecuali di-override.

Backend:
- Set/ubah/cabut akses per halaman ke anggota tertentu atau seluruh workspace.
- Link berbagi (opsional): view-only via token.
- Terapkan pengecekan permission di SEMUA endpoint page/editor/collab (termasuk
  koneksi Yjs dari Fase 5).

Frontend:
- Dialog "Share": tambah orang, pilih level akses, salin link.
- Sesuaikan UI berdasar level (viewer tidak bisa mengedit, dsb).
- Komentar dasar pada halaman (thread sederhana) — opsional jika waktu cukup.

Test: matriks izin (viewer/commenter/editor) terhadap aksi kunci. Commit.
```

---

## FASE 7 — Search, Favorites & Trash

**Tujuan:** melengkapi alur pemakaian harian.

```
FASE 7 — Search, Favorites, Trash.

Backend:
- Full-text search halaman dalam workspace (Postgres tsvector + index; index judul
  dan teks block). Endpoint search dengan ranking & snippet.
- Favorites (pin halaman per user). Trash: list halaman terarsip, restore, hapus
  permanen. Auto-purge trash > N hari (job terjadwal).

Frontend:
- Command palette (Cmd/Ctrl+K): cari & lompat ke halaman, aksi cepat.
- Bagian "Favorites" di sidebar. Halaman Trash dengan restore & delete permanen.

Test: relevansi search dasar, restore dari trash, purge. Commit.
```

---

## FASE 8 — Hardening, Performa & Deploy

**Tujuan:** benar-benar siap produksi.

```
FASE 8 — Production Hardening & Deploy.

Keamanan & robustness:
- Rate limiting per endpoint sensitif, security headers (helmet), CORS ketat,
  validasi ukuran payload, audit dependency.
- Pagination/lazy-load untuk sidebar besar & list. Index DB untuk query panas.
- Error boundary di frontend; retry & backoff di TanStack Query.

Observability:
- Structured logging (pino) dengan request id; health/readiness probe; metrik dasar.
- Integrasi Sentry (opsional) untuk error tracking web & api.

Testing & CI:
- Lengkapi Playwright E2E untuk alur inti: register→buat page→edit block→share→
  kolaborasi. Target coverage jalur kritis.
- GitHub Actions penuh: lint → typecheck → unit → integration → e2e → build image.

Deploy:
- Dockerfile produksi multi-stage untuk api & web. docker-compose.prod.yml.
- Konfigurasi env produksi + panduan deploy (Fly.io/Railway/VPS untuk api,
  Vercel/Netlify atau container untuk web, managed Postgres+Redis, S3/R2 storage).
- Strategi migrasi DB saat deploy. Backup & restore dasar.
- Perbarui README: arsitektur, cara deploy, variabel env, runbook singkat.

Kriteria selesai: image produksi ter-build, E2E lolos di CI, panduan deploy jelas
dan bisa diikuti. Commit + tag rilis v1.0.0.
```

---

## 3. Tips Agar Hasil Maksimal

- **Commit kecil & sering.** Minta Claude Code commit di tiap sub-langkah, bukan sekali di akhir fase.
- **Kunci keputusan besar di awal** (stack, editor, strategi auth) agar tidak berubah-ubah di tengah jalan.
- **Selalu minta test** di setiap fase; ini yang membuat "robust" jadi nyata, bukan sekadar klaim.
- **Jaga scope.** Kalau tergoda menambah fitur Notion lain (relation database, formula, kalender, dsb.), catat sebagai backlog "fase 9+" dan selesaikan v1 dulu.
- **Review manual** output tiap fase sebelum lanjut — Anda pilot, Claude Code kopilot.
```
