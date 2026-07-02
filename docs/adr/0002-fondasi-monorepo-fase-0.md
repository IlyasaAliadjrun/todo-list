# ADR 0002 — Fondasi monorepo & strategi build/konsumsi paket (Fase 0)

- Status: Diterima
- Tanggal: 2026-07-02

## Konteks

Fase 0 membangun kerangka monorepo (pnpm workspaces + Turborepo) dengan dua paket
bersama (`@notion/shared`, `@notion/db`) yang dikonsumsi oleh dua aplikasi berbeda
runtime: **apps/api** (NestJS, CommonJS, di-bundle oleh tsc) dan **apps/web** (Vite,
ESM, di-bundle oleh Rollup). Muncul beberapa keputusan teknis yang tidak eksplisit di
CLAUDE.md dan perlu dicatat agar konsisten di fase berikutnya.

## Keputusan

1. **Paket bersama dikompilasi ke CommonJS (tsc).** `@notion/shared` & `@notion/db`
   `type: commonjs`, output `dist/`, `main`/`types` menunjuk ke `dist`. Ini kompatibel
   langsung dengan konsumsi `require()` oleh NestJS.

2. **apps/web mengonsumsi `@notion/shared` dari SOURCE via alias Vite.**
   Konsumsi CJS `dist` menyebabkan Rollup gagal mendeteksi named export (interop
   `__exportStar`). Alih-alih menambah build ganda (ESM+CJS), Vite mem-`resolve.alias`
   `@notion/shared` → `packages/shared/src/index.ts` sehingga TS dikompilasi langsung.
   Tipe untuk `typecheck` tetap diambil dari `dist/*.d.ts`.
   Alternatif ditolak: build dual-format (tsup) menambah tooling; ESM-only memecah Nest.

3. **Barrel `packages/shared` memakai re-export EKSPLISIT**, bukan `export *`, agar
   named export terdeteksi bundler bila paket dipakai sebagai CJS di masa depan.

4. **Validasi input pakai Zod, bukan `class-validator`.** `ValidationPipe` bawaan Nest
   dilepas dari bootstrap; validasi lewat `ZodValidationPipe` per-endpoint + skema di
   `@notion/shared`. Bentuk error diseragamkan oleh `AllExceptionsFilter`.

5. **Env Prisma via `dotenv-cli` membaca `.env` root.** Script `db:*` di-prefix
   `dotenv -e ../../.env` agar Prisma menemukan `DATABASE_URL` dari cwd paket.

6. **Build script dependency diizinkan eksplisit** (`onlyBuiltDependencies` di
   `pnpm-workspace.yaml`) untuk Prisma engine, esbuild, dan Nest — pnpm 11 memblokir
   secara default. `/health` selalu HTTP 200 dengan payload status (readiness probe
   khusus ditunda ke Fase 8).

## Konsekuensi

- Konsumsi paket internal dari source (poin 2) berarti divergensi kecil antara yang
  di-typecheck (dari `dist`) dan yang di-bundle (dari `src`). Dapat digantikan build
  dual-format bila jumlah paket bersama bertambah banyak.
- Menambah endpoint baru: sediakan skema Zod di `@notion/shared` + `ZodValidationPipe`;
  jangan pakai decorator `class-validator`.
- Menambah dependency dengan build script native: daftarkan di `onlyBuiltDependencies`.
- Bila kelak butuh distribusi paket ke luar monorepo, pertimbangkan output dual ESM+CJS
  dengan `exports` map (menggantikan poin 1–3).
