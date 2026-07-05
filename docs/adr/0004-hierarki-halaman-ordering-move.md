# ADR 0004 — Hierarki halaman: fractional ordering & move/cycle (Fase 2)

- Status: Diterima
- Tanggal: 2026-07-05

## Konteks

Fase 2 menambah halaman bersarang (nested pages) dengan sidebar tree yang mendukung
reorder & re-parent lewat drag-and-drop. Dibutuhkan cara menyimpan urutan antar-saudara
yang murah saat dipindah, plus proteksi agar tree tetap valid (tanpa cycle).

## Keputusan

1. **Urutan sibling = fractional index (string).** Kolom `Page.order` menyimpan key
   dari lib `fractional-indexing` (`generateKeyBetween`). Reorder/re-parent cukup
   meng-update `order` SATU baris (key di antara dua tetangga) — tanpa menggeser
   sibling lain. Alternatif ditolak: kolom integer `position` butuh rebalancing massal;
   float presisinya habis setelah banyak reorder.

2. **API `move` menerima `{ parentId, afterId }`.** Server menghitung `order` baru =
   `generateKeyBetween(order(afterId), order(next-sibling))`. `afterId` null → jadi item
   pertama. Ini memisahkan intent klien (posisi relatif) dari representasi key.

3. **Cegah cycle di server (fungsi murni, ter-unit-test).** `wouldCreateCycle` menelusuri
   rantai ancestor calon parent; menolak bila menemui halaman yang dipindah. Move ke
   turunan sendiri → 400.

4. **Trash = soft-archive, bukan hapus.** `isArchived`/`archivedAt`. Archive & restore
   berlaku ke SELURUH subtree (`collectSubtreeIds`). Saat restore, bila induk hilang/masih
   di-trash, halaman dilepas ke root agar tak orphan. Hapus permanen memakai
   `onDelete: Cascade` Prisma (menghapus turunan).

5. **Otorisasi page = keanggotaan workspace.** Semua endpoint page mengecek membership;
   non-anggota mendapat 404 (menyembunyikan keberadaan), konsisten dengan Fase 1.

6. **DnD frontend = @dnd-kit (flattened tree + projection).** Tree diratakan jadi list
   sortable; target depth/parent dihitung dari offset horizontal pointer. Persist ke API
   lalu refetch tree (TanStack Query) untuk rekonsiliasi.

## Konsekuensi

- Reorder/re-parent = O(1) tulis DB; skala baik untuk sidebar besar.
- `order` adalah string opaque; selalu query `orderBy: { order: "asc" }` lalu bangun tree.
- Menambah operasi tree baru: gunakan helper murni di `page.util.ts` agar tetap teruji.
- Pagination/lazy-load tree & multi-select DnD belum ditangani → backlog Fase 8.
- Bila kelak butuh pindah halaman ANTAR-workspace, perlu aturan izin tambahan (kini
  move dibatasi dalam satu workspace).
