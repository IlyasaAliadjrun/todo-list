---
description: Buat commit Conventional Commits yang rapi dari perubahan saat ini
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git log:*)
---

## Status
!`git status --short`

## Diff yang akan di-commit
!`git diff HEAD`

## Tugas

1. Jalankan `pnpm lint && pnpm typecheck` dulu; jangan commit kalau gagal.
2. Kelompokkan perubahan secara logis. Bila ada beberapa perubahan tak berkaitan,
   usulkan pemisahan menjadi beberapa commit.
3. Tulis pesan **Conventional Commits**: `<type>(<scope>): <ringkasan>`.
   Type: feat, fix, refactor, chore, test, docs, perf, build, ci.
   Ringkasan imperatif & singkat; badan pesan menjelaskan *kenapa* bila perlu.
4. Tunjukkan pesan commit yang diusulkan, lalu jalankan commit-nya.

Jangan sertakan file secret/build/artefak. Hormati `.gitignore`.
