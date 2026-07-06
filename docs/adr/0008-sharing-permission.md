# ADR 0008 — Sharing & permission per-halaman (Fase 6)

- Status: Diterima
- Tanggal: 2026-07-06

## Konteks

Fase 6 menambah kontrol akses per-halaman (VIEW/COMMENT/EDIT) dengan pewarisan ke
sub-page, dan menegakkannya di SEMUA jalur (REST page/database + koneksi Yjs).

## Keputusan

1. **Model `PagePermission(pageId, subjectType: USER|WORKSPACE, subjectId, level)`.**
   Unik per (pageId, subjectType, subjectId).

2. **Resolusi level (fungsi murni `resolveEffectiveLevel`, ter-unit-test):**
   - Bukan anggota workspace → tanpa akses (null).
   - **OWNER/ADMIN → EDIT** (pengelola bypass).
   - Selain itu: telusuri ancestor TERDEKAT yang punya permission = **titik override**
     untuk subtree-nya (grant cocok: USER milik user atau WORKSPACE). Node itu punya
     permission tapi tak ada yang cocok → null (privat).
   - **Tak ada permission di seluruh rantai → default EDIT** (kompatibel Fase 2: tim
     tetap bisa kolaborasi; sharing dipakai untuk MEMBATASI atau membuka ke user
     tertentu). Begitu halaman diberi permission, ia jadi privat ke subjek terdaftar.

3. **Enforcement lewat `PermissionService`:**
   - `requireLevel(pageId, userId, min)`: <VIEW → 404 (sembunyikan), <min → 403.
   - Refactor SEMUA cek `requireMembership` di page & database → resolusi permission.
     Baca ≥VIEW, tulis ≥EDIT. `buildResolver` (in-memory) memfilter tree per-halaman.
   - `GET /pages/:id` menyertakan `myLevel` agar UI menyesuaikan (editor read-only, dll).

4. **Koneksi Yjs (`onAuthenticate`)**: resolusi level dokumen (= pageId). <VIEW ditolak;
   VIEW/COMMENT → `connection.readOnly = true` (tak bisa menulis dokumen).

5. **Frontend**: dialog "Bagikan" (tambah user via email / seluruh workspace, pilih
   level, cabut, salin link). Editor & judul read-only bila `myLevel !== EDIT`;
   viewer/commenter tak meng-autosave snapshot (hindari 403).

## Konsekuensi

- Backward-compatible: workspace tanpa sharing berperilaku seperti Fase 2 (semua anggota
  EDIT). Membatasi = tambah permission.
- Diverifikasi (REST): default EDIT, restrict→VIEW (403 tulis), grant override, warisan
  ke sub-page, tree menyembunyikan halaman terbatas, outsider 404. Yjs: write viewer
  ditolak server-side.
- **Keterbatasan**: koneksi Yjs read-only (viewer) memuat konten SAAT membuka tetapi
  belum menerima update LIVE (Hocuspocus readOnly memblok broadcast ke koneksi itu).
  Viewer refresh untuk melihat perubahan. Sinkronisasi-live untuk viewer → backlog Fase 8.
- Sharing ke user di LUAR workspace & share-link publik → di luar scope (backlog).
- COMMENT ada di model tapi fitur komentar sendiri ditunda (backlog); COMMENT kini
  berperilaku seperti VIEW untuk penulisan (read-only) + hak lebih dari VIEW disiapkan.
