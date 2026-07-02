# Setup Development — Ubuntu 20.04 LTS

Semua instalasi & runtime ditargetkan ke **Ubuntu 20.04 (Focal)**. Paket bawaan
distro ini tua, jadi ikuti langkah di bawah (jangan `apt install nodejs`).

## 1. Node.js (via nvm) + pnpm

```bash
# Pasang nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# muat nvm (atau buka terminal baru)
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"

# Node LTS (20 atau 22)
nvm install 22
nvm use 22
nvm alias default 22

# pnpm via corepack (bawaan Node)
corepack enable
corepack prepare pnpm@latest --activate

node -v && pnpm -v
```

## 2. Docker Engine + Compose v2 (repo resmi Docker)

Jangan pakai `docker.io` dari apt (versinya lama). Ikuti repo resmi:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu focal stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# jalankan docker tanpa sudo (logout/login setelahnya)
sudo usermod -aG docker "$USER"

docker --version && docker compose version   # v2: "docker compose", bukan "docker-compose"
```

## 3. Layanan data (lewat Docker, bukan apt)

Postgres, Redis, dan MinIO dijalankan sebagai container:

```bash
cp .env.example .env      # lalu isi nilainya
docker compose up -d      # nyalakan postgres, redis, minio
```

## 4. Proyek

```bash
pnpm install
pnpm db:migrate           # terapkan migration Prisma
pnpm dev                  # web + api
```

## 5. Playwright (untuk E2E, Fase 8)

```bash
pnpm exec playwright install --with-deps
```
Di 20.04 beberapa dependency sistem mungkin perlu dipasang manual bila `--with-deps`
melewatkannya — ikuti pesan error Playwright.

## Catatan penting

- **glibc 2.31**: sebagian binary modern butuh glibc lebih baru. Menjalankan
  API/worker di dalam container image Node resmi menghindari masalah ini.
- **Status support**: standard support Ubuntu 20.04 sudah berakhir (kini fase ESM).
  Untuk produksi jangka panjang, aktifkan **Ubuntu Pro/ESM** demi update keamanan,
  atau rencanakan upgrade ke 22.04/24.04 (catat di runbook deploy).
- Host cukup menjalankan Node + Docker; semua service stateful hidup di container.
