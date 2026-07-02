---
description: Tutup fase — verifikasi kriteria selesai, test, dokumentasi, commit
allowed-tools: Read, Grep, Glob, Bash, Edit
---

Kita menutup fase yang sedang dikerjakan. Lakukan checklist berikut secara berurutan
dan laporkan hasil tiap langkah:

1. Buka `docs/roadmap.md`, ambil **kriteria selesai** fase aktif. Cek satu per satu
   apakah sudah terpenuhi. Kalau ada yang belum, selesaikan dulu.
2. Jalankan kualitas: `pnpm lint`, `pnpm typecheck`, `pnpm test`. Perbaiki kegagalan.
3. Pastikan fitur baru punya test yang memadai (unit/integration/e2e sesuai fase).
4. Perbarui dokumentasi bila perlu: `docs/architecture.md`, `.env.example`,
   `README`, dan tulis ADR baru untuk keputusan arsitektur signifikan.
5. Perbarui bagian **Status saat ini** di `CLAUDE.md` ke fase berikutnya.
6. Buat commit Conventional Commits yang deskriptif untuk pekerjaan fase ini.

Akhiri dengan ringkasan singkat: apa yang selesai, apa yang ditunda ke backlog, dan
apa fokus fase berikutnya.
