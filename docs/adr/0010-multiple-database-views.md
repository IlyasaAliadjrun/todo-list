# ADR 0010 — Multiple database views: Board, Gallery, Calendar (Fase 9)

- Status: Diterima
- Tanggal: 2026-07-08

## Konteks

Fase 4 hanya menyediakan **Table view** untuk database. Roadmap (backlog) mencatat
"view lain (board/calendar/timeline); grouping". Fase 9 menambah tiga view sesuai
gaya Notion: **Board (Kanban)**, **Gallery**, dan **Calendar**, dengan pilihan view
& properti konfigurasinya **disimpan di database** (bukan hanya per-browser) agar
konsisten untuk semua anggota workspace.

## Keputusan

1. **Satu view aktif per database (bukan multi-view tersimpan).** Konfigurasi
   disimpan sebagai kolom di model `Database`:
   - `viewType` enum `DatabaseViewType { TABLE BOARD GALLERY CALENDAR }` (default `TABLE`).
   - `groupByPropertyId String?` — properti `SELECT` sumber kolom Board.
   - `datePropertyId String?` — properti `DATE` yang memosisikan kartu di Calendar.
   - `coverPropertyId String?` — properti `URL` opsional untuk sampul kartu Gallery.

   Multi-view bertab (mis. "By Status" + "All Projects" di Notion) = backlog; satu
   view aktif cukup untuk kebutuhan inti & meminimalkan skema.

2. **Referensi properti bersifat lunak (soft ref), divalidasi saat set.** Kolom
   `*PropertyId` hanya `String?` biasa (bukan relasi FK) agar `onDelete` properti tak
   memerlukan aturan cascade khusus. Saat `updateView`, id divalidasi milik database
   & bertipe sesuai (SELECT untuk group-by, DATE untuk date, dsb). Saat render, id
   yang menunjuk properti yang sudah dihapus di-fallback dengan aman (Board minta
   pilih ulang; Calendar/Gallery pakai properti pertama yang cocok / kosong).

3. **Endpoint `PATCH /databases/:id/view`** (butuh **≥EDIT**, konsisten dgn tulis
   database lain) mengubah konfigurasi view. `loadFull` mengembalikan keempat field
   baru sehingga klien punya satu sumber kebenaran. Skema Zod
   `UpdateDatabaseViewInputSchema` (semua field opsional, minimal satu, nullable untuk
   mengosongkan).

4. **Drag Board → update sel, bukan mekanisme baru.** Memindah kartu antar kolom Board
   memanggil `setCell(row, groupByPropertyId, optionId)` — endpoint sel Fase 4 yang
   sudah ada, sehingga validasi/normalisasi & permission tetap satu jalur. DnD memakai
   `@dnd-kit` (sudah dipakai sidebar).

5. **Refactor frontend jadi container + view.** `DatabaseView` menjadi shell
   (switcher view + selector konfigurasi) yang me-render `TableView` / `BoardView` /
   `GalleryView` / `CalendarView`. Helper bersama (`cellOf`, `displayText`, judul baris,
   `RecordCard`) diekstrak ke `database-shared.tsx`. Logika pengelompokan Board
   (`groupRowsByOption`) fungsi murni → diuji unit.

## Adendum (feedback UX)

- **UI hanya Tabel + Board.** Setelah dipakai, Gallery & Calendar dinilai kurang sesuai
  kebutuhan inti dan membuat switcher ramai → **ditunda dari UI** (komponennya dihapus).
  Enum `DatabaseViewType` tetap menyimpan GALLERY/CALENDAR (kompat data); container
  memperlakukan nilai non-BOARD sebagai Tabel. Helper `bucketRowsByDate`/`dateKeyOf` tetap
  di shared (teruji) untuk dipakai lagi bila Calendar diaktifkan.
- **RecordPanel (peek ala Notion).** Klik kartu Board atau tombol "buka" pada baris Tabel
  membuka panel kanan (portal ke body, backdrop, Escape) untuk mengedit **semua** properti
  satu record via `CellEditor` yang sama. Di Board, klik dibedakan dari drag lewat flag
  `draggingRef` (di-set `onDragStart`, di-reset setelah `onDragEnd`).
- **FloatingMenu (portal).** Menu setelan kolom & dropdown multi-select dulu absolut di dalam
  `overflow-x-auto` tabel → **ter-clip** (tak bisa pilih tipe). Kini dirender via portal ke
  `body` (fixed) sehingga tampil penuh & lepas dari contentEditable BlockNote. Opsi SELECT
  kini punya **pemilih warna** (titik warna, siklus saat diklik; opsi baru auto-warna).

## Konsekuensi

- View & konfigurasinya persist lintas sesi/anggota (disimpan di DB).
- Board hanya untuk properti `SELECT` (single). `MULTI_SELECT`/`STATUS` sebagai
  sumber kolom = backlog. Bila belum ada properti SELECT, Board memandu membuat/memilih.
- Calendar & Gallery read-positioning: Calendar menaruh kartu pada tanggal
  `datePropertyId`, tombol "+" per hari menambah baris dengan tanggal itu; Gallery
  menampilkan sampul dari `coverPropertyId` bila di-set. Drag di Calendar (ubah
  tanggal via seret) = backlog.
- Satu view aktif: mengganti view mengubahnya untuk semua yang membuka database
  tersebut (sesuai keputusan "persist ke DB"). Multi-view bertab = backlog.
