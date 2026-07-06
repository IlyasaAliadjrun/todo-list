# Deployment & Runbook

## Prinsip

- Semua service (api+hocuspocus, web, postgres, redis, minio) sebagai container.
- Config lewat env; tidak ada secret di image/repo. Migrasi DB = langkah rilis terpisah.

## Artefak (Fase 8)

- `apps/api/Dockerfile.prod` — API multi-stage, runtime **non-root**, `NODE_ENV=production`,
  HEALTHCHECK ke `/health/live`.
- `apps/web/Dockerfile.prod` + `apps/web/nginx.conf` — build statis Vite disajikan **Nginx**,
  sekaligus **proxy** REST (`/auth`, `/pages`, …) & **WebSocket** (`/collab`) ke service `api`.
- `docker-compose.prod.yml` — stack single-host, termasuk service `migrate` (sekali,
  `prisma migrate deploy`) yang harus sukses sebelum `api` start.

## Deploy single-host (VPS)

```bash
# 1. Siapkan .env produksi (secret KUAT — jangan pakai default dev):
cp .env.example .env
#   - JWT_ACCESS_SECRET/JWT_REFRESH_SECRET: openssl rand -hex 32
#   - POSTGRES_PASSWORD, S3_ACCESS_KEY, S3_SECRET_KEY: ganti semua
#   - S3_PUBLIC_ENDPOINT: URL MinIO/S3 yang DIAKSES BROWSER (mis. https://storage.domain.com)
#   - WEB_ORIGIN: https://app.domain.com

# 2. Build & jalankan (migrate otomatis jalan sebelum api):
docker compose -f docker-compose.prod.yml up -d --build

# 3. Cek health:
curl -fsS http://localhost:80/health   # via nginx → api → {"status":"ok"}
```

### TLS (WAJIB untuk produksi)

Refresh-token cookie ber-flag **Secure** saat `NODE_ENV=production` → hanya terkirim
lewat **HTTPS**. Taruh reverse proxy TLS (Caddy/Traefik/Nginx) di depan service `web`:

```
app.domain.com     → web:80   (SPA + proxy API/ws)
storage.domain.com → minio:9000  (opsional, bila upload gambar dipakai)
```

Contoh Caddy: `app.domain.com { reverse_proxy web:80 }` (Caddy urus sertifikat otomatis).

## Alternatif PaaS / managed

Kode portabel S3-compatible & Postgres/Redis standar:
- **API+Hocuspocus**: Fly.io / Railway / VPS (butuh WebSocket support).
- **Web**: Vercel/Netlify (static) — set proxy/redirect ke API, atau pakai container Nginx.
- **DB/cache/storage**: Postgres & Redis terkelola; storage **Cloudflare R2 / Backblaze B2
  / Supabase / MinIO self-host** (ganti `S3_*`, `S3_PUBLIC_ENDPOINT`).

## Env penting (lihat `.env.example` untuk lengkap)

`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`,
`S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `WEB_ORIGIN`, `HOCUSPOCUS_URL`,
`RATE_LIMIT_PER_MIN`, `LOG_LEVEL`.

## Migrasi DB

- Rilis menjalankan `prisma migrate deploy` (idempoten, hanya migration baru).
- Di compose prod: service `migrate` (one-shot) → `api` menunggu selesai.
- Manual: `pnpm --filter @notion/db migrate:deploy`.

## Backup & restore

```bash
# Backup Postgres (jadwalkan harian + retensi):
docker exec notion-clone-prod-postgres-1 pg_dump -U notion notion | gzip > backup-$(date +%F).sql.gz
# Restore:
gunzip -c backup-YYYY-MM-DD.sql.gz | docker exec -i notion-clone-prod-postgres-1 psql -U notion notion
# Object storage: aktifkan versioning bucket / mirror `mc mirror` ke lokasi kedua.
```

Uji restore secara berkala (backup tak teruji = tak ada backup).

## Email (undangan)

Undangan workspace dikirim via **SMTP (nodemailer)**. Set env `MAIL_HOST`, `MAIL_PORT`,
`MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`, dan `APP_URL` (untuk link undangan).
Kompatibel Resend/Mailgun/SendGrid/SES/Gmail — cukup ganti kredensial. Bila `MAIL_HOST`
kosong, email dinonaktifkan dan undangan memakai **token copy-paste** (fallback).
Produksi: pakai `MAIL_FROM` dengan **domain terverifikasi** (SPF/DKIM) agar tak masuk spam.
Link undangan `/invite?token=…` menangani alur daftar/login → auto-join.

## Observability

- Structured logging **pino** + `x-request-id` per request.
- Probe: `/health/live` (liveness), `/health` & `/health/ready` (readiness: DB+Redis).
- Security headers via **helmet**; rate limit global (`RATE_LIMIT_PER_MIN`) + rate-limit
  login berbasis Redis.
- Sentry (opsional) via `SENTRY_DSN`.

## Skala & keterbatasan (backlog)

- Multi-instance: butuh **adapter Redis Hocuspocus** (pub/sub) + throttler storage Redis +
  leader untuk cron purge. Kini single-instance.
- Optimasi ukuran image API (prune/`pnpm deploy`).
- Viewer collab live-sync (kini read-only memuat konten saat buka).

## Catatan Ubuntu 20.04

Standard support 20.04 berakhir (fase ESM). Untuk host produksi jangka panjang, aktifkan
Ubuntu Pro/ESM atau upgrade ke 22.04/24.04. App berjalan di container → upgrade OS host
berisiko rendah terhadap app.
