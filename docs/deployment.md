# Deployment & Runbook

## Prinsip

- Semua service (api+hocuspocus, web, postgres, redis, minio) sebagai container.
- Config lewat env; tidak ada secret di image/repo. Migrasi DB = langkah rilis terpisah.

## Artefak (Fase 8)

- `apps/api/Dockerfile.prod` — API multi-stage, runtime **non-root**, `NODE_ENV=production`,
  HEALTHCHECK ke `/health/live`.
- `apps/web/Dockerfile.prod` + `apps/web/nginx.conf` — build statis Vite disajikan **Nginx**,
  sekaligus **proxy** REST (`/auth`, `/pages`, …) & **WebSocket** (`/collab`) ke service `api`.
- `Caddyfile` + service `caddy` — terminasi **TLS** (Let's Encrypt otomatis), satu-satunya
  service yang terekspos internet (80/443). Route: `APP_DOMAIN` → `web:80`,
  `STORAGE_DOMAIN` → `minio:9000`.
- `docker-compose.prod.yml` — stack single-host, termasuk service `migrate` (sekali,
  `prisma migrate deploy`) yang harus sukses sebelum `api` start.

## Prasyarat server

> `docs/setup-ubuntu.md` adalah panduan **mesin dev**, BUKAN server produksi. Jangan
> diikuti di server: langkah Node/nvm/pnpm/Playwright tidak diperlukan, dan
> `docker compose up -d` di sana menyalakan stack **dev** (lihat peringatan di bawah).

### Spesifikasi

- Ubuntu **24.04 LTS** (20.04 sudah lewat standard support — lihat catatan di akhir).
- ≤10 user: **2 vCPU / 4 GB RAM / 60 GB SSD**. 10–50 user: **4 vCPU / 8 GB / 100 GB**.
- RAM ditentukan oleh *build* (Vite+Nest ≈3–4 GB), bukan runtime (idle ≈1–1,5 GB).
  Di 4 GB, siapkan swap sebelum build pertama; atau build di CI dan server cukup `pull`.
- **DNS**: satu A record `notes.akasha.co.id` → IP server, **sebelum** stack dinyalakan
  (Caddy butuh ini untuk validasi ACME). Storage ikut domain yang sama (path bucket).

### Yang dipasang di host

Hanya **Docker Engine + Compose v2** dan **git**. Node, pnpm, PostgreSQL, Redis, MinIO,
Nginx, dan Certbot **tidak perlu** dipasang — semuanya berjalan di container (Nginx ada di
dalam image `web`; sertifikat diurus Caddy).

```bash
# git + Docker dari repo resmi (JANGAN `apt install docker.io` — tua, tanpa Compose v2).
sudo apt-get update && sudo apt-get install -y git ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
# Kodename dideteksi dari OS — jangan hardcode (mis. `focal` akan salah di 22.04/24.04).
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker "$USER"   # WAJIB logout/login — grup baru tak aktif di sesi ini
docker compose version            # v2: "docker compose", bukan "docker-compose"

# Swap 4 GB — hanya bila RAM 4 GB dan build dilakukan di server.
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Firewall — dan jebakan Docker vs ufw

```bash
sudo ufw allow 22,80,443/tcp && sudo ufw enable
```

⚠️ **ufw TIDAK memblokir port yang di-publish container.** Docker menyisipkan aturan
iptables sendiri (chain `DOCKER-USER`/`DOCKER`) yang dievaluasi **sebelum** ufw, jadi
`ufw deny 5432` tak berpengaruh pada container yang mem-publish 5432
([Docker: Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/)).
Verifikasi di server: `sudo iptables -t nat -L DOCKER -n`. Keamanan di sini datang dari
**`docker-compose.prod.yml` yang hanya mem-publish 80/443 (service `caddy`)** — bukan dari
ufw. Karena itu: jangan pernah menambah `ports:` ke postgres/redis/minio di compose prod,
dan jangan jalankan stack dev di server (lihat bawah).

### ⚠️ Selalu pakai `-f docker-compose.prod.yml`

`docker compose up -d` **tanpa `-f`** memakai `docker-compose.yml` (stack **dev**), yang
mem-publish **postgres:5432, redis:6379, minio:9000/9001 ke host** dan punya password
fallback default (`notion_dev_password`, `minioadmin`) bila `.env` tak lengkap. Di server
produksi itu = database terbuka ke internet dengan password yang ada di repo. ufw tidak
akan menyelamatkan (lihat di atas).

## Deploy single-host (VPS)

```bash
# 0. Ambil kode (build dijalankan dari source, jadi repo harus ada di server):
git clone <repo-url> && cd notion-clone

# 1. Siapkan .env produksi (secret KUAT — jangan pakai default dev):
cp .env.example .env
#   - NODE_ENV=production
#   - JWT_ACCESS_SECRET/JWT_REFRESH_SECRET: openssl rand -hex 32 (harus BERBEDA)
#   - POSTGRES_PASSWORD, S3_ACCESS_KEY, S3_SECRET_KEY: ganti semua
#   - APP_DOMAIN=https://notes.akasha.co.id
#     WEB_ORIGIN = APP_URL = S3_PUBLIC_ENDPOINT = sama (SATU domain untuk semua)
#   - ACME_EMAIL=admin@akasha.co.id
#   - HOCUSPOCUS_URL=wss://notes.akasha.co.id/collab   (wss, bukan ws)

# 2. Build & jalankan (migrate otomatis jalan sebelum api):
docker compose -f docker-compose.prod.yml up -d --build

# 3. Cek health (lewat Caddy → nginx → api):
curl -fsS https://notes.akasha.co.id/health   # → {"status":"ok"}
```

### TLS (WAJIB untuk produksi)

Refresh-token cookie ber-flag **Secure** saat `NODE_ENV=production` → hanya terkirim lewat
**HTTPS**. Tanpa TLS user akan ter-logout begitu access token (15 menit) habis. Service
`caddy` menangani ini otomatis; `web` sengaja tidak mem-publish port apa pun.

**Satu domain untuk semuanya** — tak perlu subdomain storage terpisah. Caddy memecah rute
berdasarkan path (lihat `Caddyfile`):

```
notes.akasha.co.id/notion-uploads/*  → minio:9000  (GET/PUT gambar via presigned URL)
notes.akasha.co.id/* (sisanya)       → web:80      (SPA + REST + ws /collab → api:3001)
```

Presigned URL ditandatangani API terhadap `S3_PUBLIC_ENDPOINT` (= domain ini). Route
storage memakai `handle` (bukan `handle_path`) agar path `/<bucket>/...` tidak dipangkas,
dan Caddy mempertahankan Host asli — dua hal itu wajib supaya signature SigV4 valid. Nama
bucket di route mengikuti `S3_BUCKET` (default `notion-uploads`). Volume `caddydata`
menyimpan sertifikat — jangan dihapus (rate limit Let's Encrypt).

> Alternatif: mau storage di subdomain sendiri (mis. `storage.akasha.co.id`)? Tambah A
> record ke IP yang sama, set `S3_PUBLIC_ENDPOINT` ke subdomain itu, dan beri Caddy satu
> site-block `{$S3_PUBLIC_ENDPOINT} { reverse_proxy minio:9000 }`. Tidak wajib.

Uji lokal tanpa domain: `APP_DOMAIN=http://localhost` (skema `http://` mematikan ACME).

### IP klien di belakang proxy

Rantai proxy ada dua hop (Caddy → Nginx), jadi `main.ts` menyetel
`app.set("trust proxy", "uniquelocal")` — hanya hop beralamat privat (jaringan Docker) yang
dipercaya. Tanpa itu `req.ip` = IP container proxy, sehingga rate limit global dan
rate-limit login (kunci `ip:email`) kolaps jadi satu bucket bersama untuk semua user, dan
IP sesi tercatat salah. Sisi Caddy aman tanpa konfigurasi tambahan: karena `trusted_proxies`
tidak diset, Caddy **mengganti** (bukan menambah) `X-Forwarded-For` kiriman klien dengan IP
asli, sehingga IP asal tidak bisa dipalsukan.

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
