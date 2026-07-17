# ADR 0011 — Superadmin, profil, & reset password

- Status: Diterima
- Tanggal: 2026-07-17

## Konteks

App butuh: (a) halaman profil untuk personalisasi + ganti password sendiri,
(b) alur "lupa password", dan (c) panel khusus **superadmin** untuk menolong user
(mis. set password). Sebelumnya app hanya punya role **per-workspace**
(OWNER/ADMIN/MEMBER) — belum ada role global.

## Keputusan

1. **Superadmin ditentukan dari env `SUPERADMIN_EMAILS`, bukan dari DB/UI.**
   `User.isSuperAdmin` di-sync saat boot oleh `SuperAdminService`: diberikan ke
   email yang terdaftar, dan **dicabut** dari yang tak lagi terdaftar.
   **Tidak ada endpoint promote/demote** → eskalasi hak lewat API/UI tidak mungkin;
   mengubah daftar superadmin butuh akses ke env + restart (yaitu akses server).

2. **`SuperAdminGuard` membaca ulang flag dari DB tiap request** (bukan dari klaim
   JWT). Dengan begitu pencabutan lewat env langsung berlaku tanpa menunggu access
   token kedaluwarsa.

3. **Alur "lupa password" pakai token sekali pakai yang di-hash.** `PasswordResetToken`
   menyimpan sha256 token (pola sama dgn refresh token, ADR 0003); token mentah hanya
   ada di email. Berlaku 1 jam, sekali pakai; permintaan baru membatalkan token lama.
   - `POST /auth/forgot-password` **selalu 204 dengan body kosong** — respons tidak
     boleh membocorkan apakah sebuah email terdaftar (user enumeration), dan token
     **tidak pernah** dikembalikan ke klien (kalau iya, siapa pun bisa mereset akun
     orang lain). Bila email nonaktif, token hanya dicatat di **log server** sebagai
     jalan darurat operator.
   - `POST /auth/reset-password` menukar token dgn password baru lalu **mencabut semua
     sesi** user.

4. **Ganti password sendiri mencabut semua sesi, lalu menerbitkan sesi baru untuk
   perangkat yang sedang dipakai.** Jadi perangkat lain ikut logout (aman) tanpa
   membuat user yang sedang aktif ikut terlempar keluar.

5. **Aksi admin dibatasi & dapat diaudit.** Superadmin bisa: lihat daftar user
   (+jumlah workspace & sesi aktif), set password (langsung cabut semua sesi user
   itu), paksa logout, dan hapus user. **Superadmin tak bisa dihapus** dan tak bisa
   menghapus dirinya sendiri. Setiap aksi dicatat di log (`warn`).

## Konsekuensi

- Menambah superadmin = ubah `SUPERADMIN_EMAILS` + restart API. Tidak bisa dari UI —
  disengaja (permukaan serangan lebih kecil).
- Email reset baru benar-benar terkirim setelah `MAIL_HOST` aktif; sebelum itu alurnya
  tetap berfungsi lewat token di log server.
- Belum ada: verifikasi email, 2FA, rate-limit khusus `forgot-password` (kini hanya
  throttler global), dan audit-log persisten (baru log aplikasi) → backlog.
