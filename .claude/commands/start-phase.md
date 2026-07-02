---
description: Mulai kerjakan satu fase pengembangan dari roadmap
argument-hint: "[nomor fase]"
allowed-tools: Read, Grep, Glob, Bash
---

Kita akan mengerjakan **Fase $ARGUMENTS** dari roadmap proyek.

Langkah:
1. Baca `docs/roadmap.md` dan temukan definisi Fase $ARGUMENTS (tujuan, scope,
   kriteria selesai). Baca juga `CLAUDE.md` untuk stack & konvensi.
2. Periksa kondisi repo saat ini (`git status`, struktur folder terkait) untuk tahu
   apa yang sudah ada dari fase sebelumnya.
3. Buat rencana kerja singkat untuk fase ini: daftar tugas berurutan, model data /
   endpoint / komponen yang akan dibuat, dan risiko utama.
4. Tunggu konfirmasiku sebelum mulai menulis kode besar. Jika ada keputusan
   arsitektur signifikan, usulkan ADR baru.

Batasi diri HANYA pada scope Fase $ARGUMENTS. Fitur di luar scope → catat sebagai
backlog di roadmap, jangan dikerjakan.
