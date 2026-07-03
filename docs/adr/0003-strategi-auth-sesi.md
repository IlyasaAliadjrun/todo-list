# ADR 0003 — Strategi Auth & Sesi (Fase 1)

- Status: Diterima
- Tanggal: 2026-07-03

## Konteks

Fase 1 butuh autentikasi untuk pemakaian pribadi & tim: register/login/logout, sesi
yang bisa dipulihkan lintas reload, dan bisa **dicabut** (logout, deteksi pencurian).
SPA (apps/web) di origin berbeda dengan API saat dev; keamanan token vs kenyamanan
harus seimbang.

## Keputusan

1. **Access token = JWT pendek** (default 15 menit), ditandatangani `JWT_ACCESS_SECRET`,
   dikembalikan di **body** respons dan disimpan **di memori** web (bukan localStorage →
   mitigasi XSS). Dikirim via header `Authorization: Bearer`.

2. **Refresh token = opaque random 256-bit**, disimpan **hanya sebagai hash SHA-256** di
   tabel `Session`, dikirim sebagai **cookie httpOnly** (`SameSite=Lax`, `Secure` di
   produksi). Alternatif "refresh = JWT" **ditolak** karena tak bisa dicabut server-side.

3. **Rotasi tiap refresh**: refresh lama di-`revokedAt`, diterbitkan yang baru, tautan
   `replacedById`. **Deteksi reuse**: bila refresh yang sudah di-revoke dipakai lagi
   (indikasi pencurian), SEMUA sesi aktif user dicabut.

4. **Password** di-hash dengan **argon2id** (paket `argon2`).

5. **Rate limit login** berbasis Redis: counter per `IP:email`, direset saat sukses.

6. **RBAC workspace** berbasis `WorkspaceMember.role` (OWNER > ADMIN > MEMBER). Dicek
   eksplisit di service (`requireRole`) pada setiap operasi workspace.

7. **Dev cross-origin**: web memanggil API lewat **Vite proxy** (`/auth`, `/api`) →
   same-origin sehingga cookie httpOnly mengalir mulus tanpa `SameSite=None`.

8. **Registrasi transaksional**: user + workspace `PERSONAL` + membership `OWNER` dibuat
   dalam satu `prisma.$transaction`.

## Konsekuensi

- Sesi bisa dicabut & di-audit (tabel `Session`); mendukung "logout semua perangkat"
  di masa depan.
- Reload web memicu 1x `POST /auth/refresh` (silent login) sebelum render router.
- Access token pendek → 401 wajar; klien auto-refresh sekali lalu retry.
- **Testcontainers integration test ditunda ke Fase 8** (butuh SWC untuk metadata
  dekorator Nest di vitest + Postgres service di CI). Fase 1 dijamin oleh unit test
  (argon2, rotasi refresh dengan Prisma di-stub, slug) + verifikasi alur end-to-end
  langsung ke API berjalan (15 cek: register→login→refresh→logout, workspace, undangan,
  RBAC). Dicatat sebagai backlog.
- `JWT_REFRESH_SECRET` di `.env.example` tidak lagi dipakai (refresh bersifat opaque);
  dipertahankan sementara untuk kompatibilitas, boleh dihapus di fase mendatang.
