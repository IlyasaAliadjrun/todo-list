# Deployment & Runbook

## Prinsip

- Semua service (api, hocuspocus, web, postgres, redis, minio) sebagai container.
- Config lewat env. Tidak ada secret di image atau repo.
- Migrasi DB dijalankan sebagai langkah rilis terpisah, bukan saat boot app.

## Artefak

- **Dockerfile produksi** multi-stage untuk `apps/api` dan `apps/web`.
- `docker-compose.prod.yml` untuk deploy single-host / VPS.
- Image di-build & di-push oleh GitHub Actions.

## Target deploy (pilih sesuai kebutuhan)

- **VPS Ubuntu** (mis. 22.04+ disarankan untuk produksi): `docker-compose.prod.yml`
  + reverse proxy (Caddy/Nginx) + TLS.
- **PaaS**: API & Hocuspocus di Fly.io/Railway; web di Vercel/Netlify (atau container
  yang sama); Postgres & Redis terkelola; storage S3/R2.

## Variabel environment (lihat .env.example untuk daftar lengkap)

- `DATABASE_URL`, `REDIS_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- `WEB_ORIGIN` (untuk CORS), `HOCUSPOCUS_URL`

## Prosedur rilis

1. CI hijau: lint → typecheck → unit → integration → e2e → build image.
2. Jalankan migrasi DB terhadap database produksi (`prisma migrate deploy`).
3. Deploy image baru (rolling). Pastikan health/readiness probe hijau.
4. Smoke test alur inti (login, buat page, edit, share).

## Backup & pemulihan

- Backup Postgres terjadwal (dump harian + retensi). Uji restore berkala.
- Backup bucket object storage (versioning bila tersedia).

## Observability

- Structured logging (pino) dengan request id.
- Health (`/health`) & readiness probe.
- Error tracking (Sentry opsional) untuk web & api.

## Catatan Ubuntu 20.04

- Standard support 20.04 sudah berakhir (fase ESM). Untuk host produksi jangka
  panjang, aktifkan Ubuntu Pro/ESM atau rencanakan upgrade OS. Karena app berjalan
  dalam container, upgrade OS host berisiko rendah terhadap app.
