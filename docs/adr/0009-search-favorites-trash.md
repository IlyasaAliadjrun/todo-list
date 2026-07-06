# ADR 0009 — Search, favorites & auto-purge trash (Fase 7)

- Status: Diterima
- Tanggal: 2026-07-06

## Konteks

Fase 7 melengkapi alur harian: full-text search halaman, favorites, dan pembersihan
otomatis trash.

## Keputusan

1. **Full-text search Postgres (tsvector).** Kolom `Page.searchText` (teks polos hasil
   `blockNoteToText` dari konten) di-update saat autosave. Kolom `Page.searchVector`
   (`tsvector`, dideklarasi `Unsupported` di Prisma) di-maintain oleh **trigger**
   `page_search_vector_trg` dari `title + searchText`, dengan **index GIN**. Config
   text search `simple` (tanpa stemming) → cocok untuk teks Indonesia/campur.
   - Query via `$queryRaw`: `websearch_to_tsquery` + `ts_rank` (ranking) +
     `ts_headline` (snippet, match dibungkus `<b>`).
   - **Hasil difilter permission** (`buildResolver`) → hanya halaman ≥VIEW.

2. **Trigger + `Unsupported` (bukan generated column) untuk hindari drift Prisma.**
   Prisma mengelola `searchText`, `searchVector` (kolom + GIN index); trigger &
   backfill ditambахkan lewat SQL raw di migration (trigger tak dilacak Prisma → tak
   ada drift). `searchVector` hanya diakses lewat SQL raw.

3. **Favorites**: model `Favorite(userId, pageId)` unik. Favorit butuh ≥VIEW; list
   difilter permission. `isFavorite` disertakan di `PageDetail`.

4. **Command palette (Cmd/Ctrl+K, `cmdk`)**: cari halaman (debounce via query key) +
   aksi cepat (halaman baru, buka trash). Snippet `<b>` dirender **aman** (parse ke
   `<mark>`, tanpa `innerHTML`).

5. **Auto-purge trash**: `@nestjs/schedule` cron harian (`PurgeService`) menghapus
   permanen halaman terarsip > 30 hari. Logika `purgeExpired(days)` terpisah agar
   mudah diuji/dipanggil manual.

## Konsekuensi

- Search cepat (GIN index), otomatis ter-update (trigger) tiap judul/konten berubah.
- Diverifikasi: search title+konten dengan snippet & highlight, ranking, filter
  permission (outsider 404), favorites toggle+list, palette Cmd/K (visual Playwright).
- Search config `simple` = pencocokan literal (tanpa stemming/typo tolerance) →
  fuzzy/multi-bahasa = backlog.
- `searchVector` tak bisa di-query lewat Prisma Client (hanya raw) — konsekuensi dari
  `Unsupported`. Search terpusat di `SearchService`.
- Purge berjalan di instance API; multi-instance → cukup satu leader (backlog Fase 8).
