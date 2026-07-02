---
description: Buat perubahan skema Prisma + migration dengan aman
argument-hint: "[deskripsi perubahan skema]"
allowed-tools: Read, Grep, Glob, Bash, Edit
---

Buat perubahan skema database berikut: **$ARGUMENTS**

Aturan:
1. Ubah `packages/db/prisma/schema.prisma`. Pertahankan penamaan & relasi yang
   konsisten dengan model lain.
2. **Jangan** mengedit file migration yang sudah ada. Buat migration BARU:
   `pnpm db:migrate` (mode dev membuat migration + menerapkannya).
3. Perbarui tipe/skema Zod terkait di `packages/shared` bila bentuk data berubah.
4. Pertimbangkan index untuk kolom yang sering di-query/di-filter.
5. Pastikan `pnpm typecheck` lolos di semua paket setelah `prisma generate`.
6. Sebutkan dampak migrasi terhadap data yang sudah ada (nullable? default?
   backfill?) dan apakah perlu langkah manual saat deploy.

Tunjukkan diff schema dan SQL migration yang dihasilkan sebelum menutup tugas.
