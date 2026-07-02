# Scaffold Claude Code — Notion-Clone

Salin isi folder ini ke **root repo** proyek Anda. Isinya membuat pengembangan lintas
sesi jadi cepat & konsisten.

## Isi

```
CLAUDE.md                     # memory proyek — dibaca otomatis Claude Code tiap sesi
.env.example                  # daftar env; salin ke .env
.gitignore
docker-compose.yml            # infra dev: postgres, redis, minio (+ init bucket)
scripts/
  setup-ubuntu.sh             # cek prasyarat Ubuntu 20.04 (node, pnpm, docker)
.claude/commands/             # slash command kustom
  start-phase.md              # /start-phase <n>  — mulai satu fase dari roadmap
  finish-phase.md             # /finish-phase     — tutup fase (cek DoD, test, commit)
  new-feature.md              # /new-feature <..> — fitur baru end-to-end sesuai konvensi
  db-migrate.md               # /db-migrate <..>  — ubah skema Prisma + migration aman
  review.md                   # /review           — review diff (bug, keamanan, konvensi)
  commit.md                   # /commit           — commit Conventional Commits rapi
docs/
  roadmap.md                  # daftar 9 fase + Definition of Done
  architecture.md             # gambaran sistem & aliran data
  conventions.md              # aturan kode, API, DB, test, git
  setup-ubuntu.md             # instalasi lengkap di Ubuntu 20.04
  deployment.md               # runbook deploy & backup
  adr/0001-...md              # cara mencatat keputusan arsitektur + template
  prompt-notion-clone-...md   # prompt lengkap tiap fase (sumber utama)
```

## Cara pakai

1. Salin semua file ini ke root repo (buat repo dulu bila belum ada).
2. Cek prasyarat Ubuntu 20.04: `bash scripts/setup-ubuntu.sh --env`
   (mengecek node/pnpm/docker dan menyiapkan `.env` dari `.env.example`).
3. Nyalakan infra: `docker compose up -d` (postgres, redis, minio + bucket).
4. Jalankan Claude Code di folder repo. `CLAUDE.md` otomatis termuat.
   (Opsional: `/init` untuk memperkaya `CLAUDE.md`, lalu `/memory` menyunting.)
5. Mulai fase pertama: ketik `/start-phase 0`.
6. Saat fase selesai: `/finish-phase`.
7. Untuk kerja harian: `/new-feature ...`, `/db-migrate ...`, `/review`, `/commit`.

> Catatan: `docker-compose.yml` saat ini hanya menyalakan service data. Service
> `api` & `web` diaktifkan di Fase 0 setelah kode & Dockerfile-nya dibuat (blok
> komentar sudah disiapkan di dalam file).

## Catatan

- Slash command `.claude/commands/*.md` didukung penuh. Anda juga bisa memigrasikannya
  ke format skill (`.claude/skills/<nama>/SKILL.md`) bila ingin command bisa dipanggil
  otomatis oleh Claude saat deskripsinya cocok — tapi ini opsional.
- Perbarui bagian **Status saat ini** di `CLAUDE.md` setiap ganti fase.
- Jaga `CLAUDE.md` tetap ringkas; detail panjang taruh di `docs/`.
