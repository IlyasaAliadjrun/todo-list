# Arsitektur

Dokumen hidup yang menjelaskan bagaimana sistem tersusun. Perbarui saat arsitektur
berubah.

## Gambaran besar

```
                    ┌─────────────────────────┐
                    │      apps/web (SPA)      │
                    │  React + Vite + BlockNote│
                    └───────────┬──────────────┘
                     REST/HTTP  │  WebSocket (Yjs)
                    ┌───────────▼──────────────┐
                    │        apps/api          │
                    │  NestJS  +  Hocuspocus    │
                    └──┬─────────┬─────────┬────┘
                       │         │         │
                 ┌─────▼──┐ ┌────▼───┐ ┌──▼─────┐
                 │Postgres│ │ Redis  │ │ MinIO  │
                 │(Prisma)│ │(cache) │ │  (S3)  │
                 └────────┘ └────────┘ └────────┘
```

## Paket

- **apps/web** — SPA. State server via TanStack Query, state UI via Zustand. Editor
  konten pakai BlockNote yang terhubung ke provider Yjs untuk kolaborasi.
- **apps/api** — NestJS modular (auth, workspace, page, database, permission, search)
  plus server Hocuspocus untuk sinkronisasi dokumen Yjs.
- **packages/shared** — tipe TypeScript + skema Zod dipakai bersama web & api. Sumber
  kebenaran kontrak API.
- **packages/db** — Prisma schema, generated client, migrations. Satu-satunya jalur
  ke database.

## Aliran data kunci

- **CRUD & metadata** (auth, page tree, permission, properti database) lewat REST API
  NestJS. Semua tervalidasi Zod dan tercek otorisasi.
- **Konten dokumen** disimpan sebagai JSON block BlockNote di kolom jsonb; saat
  kolaborasi aktif, sumber kebenaran real-time adalah dokumen Yjs yang di-persist
  berkala ke Postgres oleh Hocuspocus.
- **Upload gambar** via presigned URL ke MinIO/S3; API hanya menyimpan URL.

## Model otorisasi

- Keanggotaan workspace (OWNER/ADMIN/MEMBER) menentukan akses dasar.
- Permission per halaman (VIEW/COMMENT/EDIT) mewarisi ke sub-page kecuali di-override.
- Pengecekan otorisasi **wajib** di setiap endpoint REST DAN saat handshake koneksi
  WebSocket Yjs (non-anggota/viewer tidak boleh menulis).

## Skalabilitas & ketahanan

- API stateless → bisa di-scale horizontal; state sesi & cache di Redis.
- Hocuspocus bisa di-scale dengan adapter Redis untuk pub/sub antar-instance.
- Index DB untuk kolom panas (page tree, full-text search).
- Layanan stateful berjalan di container agar reproducible (host Ubuntu 20.04 hanya
  menjalankan Node + Docker).

## Referensi

- Keputusan arsitektur historis: `docs/adr/`.
- Konvensi kode: `docs/conventions.md`.
- Deploy: `docs/deployment.md`.
