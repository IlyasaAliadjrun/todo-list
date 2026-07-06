# ADR 0005 — Block editor: penyimpanan konten & upload gambar (Fase 3)

- Status: Diterima
- Tanggal: 2026-07-06

## Konteks

Fase 3 menambahkan editor konten per halaman. Keputusan besar (editor = **BlockNote**,
real-time = **Yjs/Hocuspocus**) sudah dikunci di CLAUDE.md. Fase 3 fokus single-user:
menyimpan/memuat dokumen + upload gambar. Real-time collaboration menyusul di Fase 5.

## Keputusan

1. **Konten disimpan sebagai JSON block BlockNote di `Page.content` (jsonb, nullable).**
   `content = editor.document` (array block). `GET /pages/:id` mengembalikan `content`
   (varian `PageDetail`); endpoint tree/list TIDAK menyertakan `content` agar ringan.

2. **Autosave debounce 500ms → `PUT /pages/:id/content`, last-write-wins.** Fase 3
   belum menangani konflik multi-editor — itu tugas Yjs di Fase 5 (yang akan menjadi
   sumber kebenaran real-time dan merekonsiliasi ke `Page.content`). Indikator
   "Menyimpan…/Tersimpan/Gagal" di UI.

3. **Upload gambar via presigned PUT ke object storage S3-compatible (MinIO lokal).**
   `POST /uploads/presign` memvalidasi tipe (`image/*`) & ukuran (≤10MB), lalu memberi
   `{ uploadUrl (presigned PUT), publicUrl, key }`. Browser meng-upload LANGSUNG ke
   storage (tidak lewat API) → hemat bandwidth API. `BlockNote.uploadFile` memakainya.

4. **Endpoint presign pakai `S3_PUBLIC_ENDPOINT` (fallback `S3_ENDPOINT`)** agar URL
   yang ditandatangani reachable dari browser. Path-style (`S3_FORCE_PATH_STYLE=true`)
   wajib untuk MinIO. Bucket sudah di-set anonymous-download oleh `minio-init`, jadi
   `publicUrl` bisa dibaca langsung.

## Konsekuensi

- Simpel & cepat untuk single-user; sadar bahwa concurrent edit = last-write-wins
  sampai Fase 5. Setelah Yjs aktif, `PUT /content` jadi jalur fallback/snapshot.
- Menyimpan blob di object storage (bukan DB/base64) → DB ramping, portabel ke S3/R2.
- Untuk deploy: cukup storage S3-compatible mana pun (MinIO self-host, Cloudflare R2,
  Backblaze B2, Supabase) — ganti env `S3_*`, tanpa ubah kode. Di container, set
  `S3_PUBLIC_ENDPOINT` ke host yang diakses browser (beda dari endpoint internal).
- Backlog: hapus objek storage saat page dihapus permanen (kini objek yatim dibiarkan),
  kuota upload, dan cover image page.
