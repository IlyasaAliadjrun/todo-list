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

## Definition of Done (berlaku semua fase)

- Kriteria selesai fase terpenuhi.
- Fitur baru ter-cover test yang memadai.
- lint + typecheck + test lolos.
- Dokumentasi & `.env.example` diperbarui bila relevan.
- ADR ditulis untuk keputusan arsitektur signifikan.
- Commit Conventional Commits dibuat.
