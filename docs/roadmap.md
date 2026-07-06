# Roadmap Pengembangan (per Fase)

Kerjakan satu fase per sesi. Detail prompt tiap fase ada di dokumen
`prompt-notion-clone-claude-code.md`. Ringkasan tujuan & kriteria selesai di bawah.

| Fase | Fokus | Kriteria selesai (ringkas) |
|------|-------|----------------------------|
| 0 | Fondasi & infrastruktur (monorepo, Docker, CI, setup Ubuntu 20.04) | Seluruh stack menyala, health "ok", lint+typecheck lolos |
| 1 | Auth & workspace | Daftar/login, workspace personal+tim, undang & kelola anggota |
| 2 | Halaman & hierarki (sidebar tree) | CRUD page bersarang, drag reorder/re-parent, trash |
| 3 | Block editor inti (BlockNote) | Block utama jalan, autosave, load, upload gambar |
| 4 | Database sederhana (table view) | CRUD kolom/baris, tipe properti dasar, validasi |
| 5 | Kolaborasi real-time (Yjs+Hocuspocus) | Multi-user konvergen, presence, otorisasi koneksi |
| 6 | Sharing & permission | Akses per halaman (VIEW/COMMENT/EDIT), pewarisan, enforcement |
| 7 | Search, favorites, trash | Full-text search, command palette, restore/purge |
| 8 | Hardening & deploy | E2E hijau di CI, image produksi, panduan deploy |

## Backlog (di luar scope v1)

Catat di sini fitur yang muncul tapi ditunda: relation/rollup database, formula,
kalender/timeline view, komentar lanjutan, notifikasi, import/export, mobile, dsb.

Dari Fase 1 (Auth & Workspace):
- Pengiriman email undangan sungguhan (kini token dikembalikan via API).
- Reset/lupa password & verifikasi email.
- OAuth/social login, 2FA.
- Harness integration test Testcontainers (butuh SWC untuk metadata dekorator Nest di
  vitest + Postgres service di CI) → dikerjakan di Fase 8 saat CI diperluas.

Dari Fase 2 (Halaman & Hierarki):
- Upload cover image halaman (kolom coverUrl sudah ada; upload di Fase 3).
- Duplicate page & template halaman.
- Pagination/lazy-load tree untuk sidebar sangat besar (Fase 8).
- Multi-select drag & auto-purge trash terjadwal (Fase 7).

Dari Fase 3 (Block Editor):
- Kolaborasi real-time / concurrent edit (Yjs + Hocuspocus) → Fase 5; kini
  autosave last-write-wins.
- Hapus objek storage saat page dihapus permanen (kini objek yatim dibiarkan).
- Kuota/limit upload per workspace, embed file non-gambar, cover image.

Dari Fase 4 (Database Sederhana):
- Relation, rollup, formula; view lain (board/calendar/timeline); grouping.
- Filter & sort tersimpan di server (kini client-side); pagination baris (Fase 8).
- Hapus baris Database saat block database dihapus dari editor (kini objek yatim).

Dari Fase 5 (Kolaborasi Real-time):
- Refresh token WebSocket saat kadaluarsa + reconnect (kini token dibaca saat mount).
- Seed atomik server-side (hindari race duplikasi saat 2 klien buka halaman lama).
- Adapter Redis Hocuspocus untuk scaling multi-instance (Fase 8).
- Comment threads real-time, riwayat versi, cursor chat.

Dari Fase 6 (Sharing & Permission):
- Sinkronisasi Yjs LIVE untuk viewer read-only (kini memuat konten saat buka saja).
- Komentar/thread halaman (level COMMENT sudah ada di model).
- Share-link publik (view-only via token), berbagi ke user di luar workspace.
- Permission granular per-block; audit log akses.

Dari Fase 7 (Search, Favorites & Trash):
- Search fuzzy/typo tolerance & multi-bahasa (kini config `simple` literal).
- Search konten database/komentar; highlight in-page saat lompat dari palette.

Dari Fase 8 (Hardening & Deploy):
- Multi-instance: adapter Redis Hocuspocus, throttler storage Redis, leader untuk cron purge.
- Optimasi ukuran image API (pnpm deploy/prune), Sentry, metrik Prometheus.
- Pagination/lazy-load sidebar & list untuk skala sangat besar.
- CDN/edge untuk web, blue-green/rolling deploy otomatis.

## Definition of Done (berlaku semua fase)

- Kriteria selesai fase terpenuhi.
- Fitur baru ter-cover test yang memadai.
- lint + typecheck + test lolos.
- Dokumentasi & `.env.example` diperbarui bila relevan.
- ADR ditulis untuk keputusan arsitektur signifikan.
- Commit Conventional Commits dibuat.
