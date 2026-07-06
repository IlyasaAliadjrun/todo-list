# ADR 0007 — Kolaborasi real-time: Yjs + Hocuspocus (Fase 5)

- Status: Diterima
- Tanggal: 2026-07-06

## Konteks

Fase 5 menambah pengeditan bersamaan multi-user. Keputusan terkunci (CLAUDE.md): pakai
**Yjs/CRDT + Hocuspocus**, bukan sinkronisasi manual. Fase 3 memakai autosave
last-write-wins; kini perlu sumber kebenaran real-time yang konvergen + otorisasi per
dokumen + persistensi.

## Keputusan

1. **Server Hocuspocus menempel di server HTTP Nest yang sama, path `/collab`.**
   Di `main.ts`, sebuah `ws.WebSocketServer({ noServer: true })` menangani event
   `upgrade` untuk URL yang diawali `/collab` dan meneruskan ke `hocuspocus.handleConnection`.
   Tidak ada port terpisah (sesuai `HOCUSPOCUS_URL=ws://localhost:3001/collab`).
   `documentName` = **pageId** (segmen terakhir URL).

2. **Otorisasi koneksi via `onAuthenticate`.** Verifikasi JWT access token (dikirim
   provider lewat opsi `token`) → cek `documentName` (pageId) milik workspace yang
   user-nya anggota. Gagal → koneksi ditolak. Konsisten dengan otorisasi REST Fase 1–4.

3. **Persistensi = snapshot biner Yjs di `Page.yjsState` (Bytes).** `onLoadDocument`
   memuat state dari DB ke Y.Doc; `onStoreDocument` (debounced oleh Hocuspocus) menulis
   `Y.encodeStateAsUpdate` ke DB. Yjs = **sumber kebenaran real-time**.

4. **`Page.content` (JSON) tetap di-autosave klien sebagai snapshot.** Dipakai untuk
   load non-collab & (nanti) full-text search Fase 7. Editor tetap memanggil
   `PUT /pages/:id/content` on-change (debounce 500ms). Jadi dua representasi: Yjs binary
   (real-time) + JSON (snapshot); klien menjaga keduanya sinkron.

5. **Migrasi konten lama → Yjs sekali di klien.** Saat `synced` pertama, bila Y.Doc
   kosong tapi `Page.content` ada isi, editor `replaceBlocks` untuk menyemai. Menghindari
   konversi BlockNote→Yjs di server (butuh BlockNote server-side).

6. **Presence** via awareness bawaan BlockNote (`collaboration.user` = nama + warna).
   Indikator online/offline dari status provider.

## Konsekuensi

- Konvergensi & persistensi terverifikasi headless (klien Node): dua provider konvergen,
  reconnect memuat ulang state dari DB, koneksi non-anggota/token invalid ditolak.
- Proxy dev Vite perlu `ws: true` untuk `/collab`.
- **Race seed**: bila dua klien membuka halaman lama (belum ada yjsState) bersamaan,
  keduanya bisa menyemai → duplikasi. Jarang (kebanyakan halaman baru mulai kosong);
  perbaikan (seed atomik server-side) = backlog.
- **Token WS tak di-refresh** saat kadaluarsa di tengah sesi (koneksi dibuat dengan token
  saat mount) → backlog: refresh + reconnect.
- **Skala multi-instance**: butuh adapter Redis Hocuspocus untuk pub/sub antar-instance →
  backlog Fase 8.
- Autosave `Page.content` kini redundan dengan Yjs untuk kasus real-time; dipertahankan
  sebagai snapshot. Bila kelak search membaca Yjs langsung, autosave JSON bisa disederhanakan.
