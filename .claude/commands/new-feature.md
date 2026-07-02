---
description: Implementasi fitur baru mengikuti konvensi full-stack proyek
argument-hint: "[deskripsi fitur]"
allowed-tools: Read, Grep, Glob, Bash, Edit
---

Implementasikan fitur berikut: **$ARGUMENTS**

Ikuti alur end-to-end sesuai konvensi di `CLAUDE.md` dan `docs/conventions.md`:

1. **Kontrak dulu**: definisikan tipe & skema Zod di `packages/shared`
   (request/response). Ini jadi sumber kebenaran untuk web & api.
2. **Data**: bila butuh perubahan skema, ubah Prisma di `packages/db` dan buat
   migration (jangan edit migration lama).
3. **Backend** (`apps/api`): service + controller/endpoint, validasi Zod,
   otorisasi (cek workspace/permission), error handling seragam.
4. **Frontend** (`apps/web`): hook TanStack Query, komponen UI (shadcn/ui + Tailwind),
   optimistic update bila relevan, penanganan loading & error.
5. **Test**: unit untuk logika, integration untuk endpoint, e2e untuk alur kritis.
6. Jalankan `pnpm lint && pnpm typecheck && pnpm test`, lalu usulkan commit.

Jangan hardcode secret. Jangan lewati otorisasi. Kalau ada asumsi, tuliskan.
