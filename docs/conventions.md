# Konvensi Kode

## Umum

- TypeScript **strict** di semua paket. Hindari `any`; bila terpaksa, beri komentar
  alasannya.
- Nama deskriptif; hindari singkatan tidak jelas.
- Fungsi/komponen fokus (satu tanggung jawab). Pecah bila terlalu besar.
- Tidak ada secret di kode. Semua config lewat env + `.env.example`.

## Kontrak & validasi

- Semua tipe & skema request/response API didefinisikan di `packages/shared` dengan
  **Zod**, lalu di-infer tipenya (`z.infer`). Web & api mengimpor dari sini.
- Validasi setiap input eksternal (body, query, params, payload WebSocket).

## API (NestJS)

- Struktur modular per domain: `auth`, `workspace`, `page`, `database`, `permission`,
  `search`, `collab`.
- Bentuk error seragam: `{ error: { code: string, message: string, details?: any } }`
  dengan HTTP status yang sesuai.
- Setiap endpoint mengecek otorisasi (guard + pengecekan permission eksplisit).
- Gunakan DTO + pipe validasi Zod. Jangan kembalikan entity Prisma mentah bila
  mengandung field sensitif.

## Frontend (React)

- Server state via **TanStack Query** (query keys konsisten, invalidasi eksplisit).
  Client/UI state ringan via **Zustand**.
- Komponen presentasional dipisah dari logika data (hooks).
- UI pakai shadcn/ui + Tailwind; hindari CSS ad-hoc yang tumpang tindih.
- Tangani ketiga state: loading, error, empty. Optimistic update untuk aksi cepat.

## Database (Prisma)

- Ubah `schema.prisma`, lalu buat **migration baru** (`pnpm db:migrate`). Jangan edit
  migration lama.
- Index untuk kolom yang sering di-filter/di-join.
- Penamaan tabel/kolom konsisten (camelCase field, model PascalCase).

## Testing

- Unit (Vitest) untuk logika murni & service.
- Integration (Testcontainers + Postgres) untuk endpoint & query.
- E2E (Playwright) untuk alur kritis: auth → buat page → edit block → share → kolab.
- Test ikut dalam PR yang memperkenalkan fitur; jangan ditunda.

## Git

- **Commit bertag kurung siku**: `[TAG] deskripsi`. Tag: `[FEAT]`, `[FIX]`, `[IMP]`,
  `[REF]`, `[DOCS]`, `[TEST]`, `[CHORE]`, `[PERF]`, `[BUILD]`, `[CI]`, `[STYLE]`,
  `[REVERT]`. Contoh: `[FEAT] tambah endpoint login`. Diverifikasi oleh commitlint.
- Branch: `feat/<ringkas>`, `fix/<ringkas>`.
- Satu PR = satu perubahan koheren. Sertakan ringkasan & cara uji.
- Pre-commit (Husky) menjalankan lint + typecheck; jangan bypass tanpa alasan.
