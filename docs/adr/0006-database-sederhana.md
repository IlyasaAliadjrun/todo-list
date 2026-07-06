# ADR 0006 — Database sederhana: model, penyimpanan sel & integrasi block (Fase 4)

- Status: Diterima
- Tanggal: 2026-07-06

## Konteks

Fase 4 menambah "database" ala Notion versi minimal (table view) yang bisa disisipkan
di halaman. Perlu model fleksibel untuk properti bertipe + nilai sel, dan cara
menyisipkannya ke dalam editor konten (BlockNote) dari Fase 3.

## Keputusan

1. **Model relasional: `Database` → `DatabaseProperty` (kolom) + `DatabaseRow` (baris)
   + `CellValue` (sel).** `CellValue` unik per `(rowId, propertyId)`. Urutan kolom &
   baris pakai fractional index (konsisten dgn ADR 0004).

2. **Nilai sel disimpan sebagai `jsonb` fleksibel; tipe ditegakkan di aplikasi.**
   Fungsi murni `normalizeCellValue(type, options, raw)` (di `@notion/shared`) memvalidasi
   & menormalkan per tipe (TEXT/NUMBER/SELECT/MULTI_SELECT/CHECKBOX/DATE/URL). Server =
   sumber kebenaran (menolak nilai tak valid → 400); klien bisa pakai untuk feedback awal.
   Opsi SELECT/MULTI_SELECT disimpan di `DatabaseProperty.options` (jsonb: `{id,name,color?}`).

3. **Ganti tipe kolom = best-effort convert.** Saat `type` berubah, nilai sel lama
   dinormalkan ulang ke tipe baru; yang tak bisa dikonversi → dikosongkan (null),
   bukan error. Menjaga UX tetap lancar.

4. **Integrasi ke editor via BlockNote CUSTOM BLOCK (pendekatan A).** Block `database`
   (`createReactBlockSpec`, `content: "none"`) hanya menyimpan `databaseId` di props;
   data asli hidup di tabel DB. Slash command `/database` membuat Database via API lalu
   menyisipkan block. Konten page tetap ramping (hanya referensi id).
   Alternatif B (database menempel ke page di luar editor) ditolak: kurang setia ke Notion.

5. **Otorisasi via keanggotaan workspace** (konsisten Fase 1–3): semua operasi
   database/kolom/baris/sel mengecek membership; non-anggota → 404.

## Konsekuensi

- Fleksibel & sederhana; query table view = 1 fetch (`GET /databases/:id` mengembalikan
  properti+baris+sel). Untuk database besar perlu pagination baris → backlog Fase 8.
- Block database di dalam konten BlockNote WAJIB `contentEditable={false}` pada wrapper
  agar input tabel tidak "ditelan" editor.
- Menambah tipe properti baru: cukup perluas `PropertyType` + `normalizeCellValue` +
  editor sel. Relation/rollup/formula sengaja di luar scope (backlog).
- Menghapus database block dari editor TIDAK otomatis menghapus baris `Database` (objek
  yatim) → backlog housekeeping.

## Catatan implementasi lintas-fase

Fase 4 juga memperbaiki proxy dev Vite: prefix `/pages`, `/databases`, `/properties`,
`/rows`, `/uploads` sebelumnya tidak diteruskan sehingga PageDetail (Fase 2) & autosave/
upload (Fase 3) 404 di browser. Kini semua prefix REST diproxy.
