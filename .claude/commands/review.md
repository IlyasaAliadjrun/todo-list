---
description: Review perubahan yang belum di-commit untuk bug, keamanan, & konvensi
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git status:*)
---

## Perubahan saat ini
!`git status --short`

## Diff
!`git diff HEAD`

## Tugas review

Tinjau diff di atas. Fokus pada hal yang benar-benar penting, urut berdasar prioritas:

1. **Bug korektness** — logika salah, edge case, race condition, null/undefined.
2. **Keamanan** — otorisasi hilang/lemah (cek workspace & permission!), input tak
   tervalidasi, kebocoran data, secret ter-hardcode, injeksi.
3. **Konvensi proyek** — sesuai `CLAUDE.md` & `docs/conventions.md`? (Zod di shared,
   bentuk error seragam, tipe strict, tidak ada `any` liar).
4. **Test** — apakah perubahan ini cukup ter-cover test?
5. **Kebersihan** — nama jelas, duplikasi, abstraksi berlebihan.

Berikan feedback ringkas & actionable. Jangan mengomentari hal sepele soal gaya kalau
sudah ditangani formatter. Sebutkan lokasi (file:baris) untuk tiap temuan.
