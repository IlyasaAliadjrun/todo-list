#!/usr/bin/env bash
# ------------------------------------------------------------------
# setup-ubuntu.sh — cek prasyarat pengembangan di Ubuntu 20.04 LTS.
#
# Skrip ini TIDAK memasang apa pun tanpa persetujuan. Secara default ia
# hanya MENGECEK & memberi instruksi. Panduan instalasi penuh: docs/setup-ubuntu.md
#
# Pakai:
#   bash scripts/setup-ubuntu.sh          # cek saja
#   bash scripts/setup-ubuntu.sh --env    # + siapkan .env dari .env.example bila belum ada
# ------------------------------------------------------------------
set -uo pipefail

REQUIRED_NODE_MAJOR=20     # minimal Node 20 (disarankan 22)
GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YEL=$'\033[0;33m'; NC=$'\033[0m'
ok(){ echo "${GREEN}✓${NC} $1"; }
warn(){ echo "${YEL}!${NC} $1"; }
err(){ echo "${RED}✗${NC} $1"; }
problems=0

echo "== Cek lingkungan pengembangan (Ubuntu 20.04) =="

# --- OS ---
if [ -r /etc/os-release ]; then
  . /etc/os-release
  echo "OS: ${PRETTY_NAME:-tidak diketahui}"
  case "${VERSION_ID:-}" in
    20.04) warn "Ubuntu 20.04 standard support sudah berakhir (fase ESM). Untuk produksi pertimbangkan Ubuntu Pro/ESM atau upgrade OS." ;;
  esac
fi

# --- Node ---
if command -v node >/dev/null 2>&1; then
  NODE_VER="$(node -v | sed 's/^v//')"
  NODE_MAJOR="${NODE_VER%%.*}"
  if [ "${NODE_MAJOR:-0}" -ge "$REQUIRED_NODE_MAJOR" ]; then
    ok "Node v${NODE_VER}"
  else
    err "Node v${NODE_VER} terlalu lama (butuh >= ${REQUIRED_NODE_MAJOR}). Pasang via nvm — lihat docs/setup-ubuntu.md."
    problems=$((problems+1))
  fi
else
  err "Node tidak ditemukan. Pasang via nvm (JANGAN apt) — lihat docs/setup-ubuntu.md."
  problems=$((problems+1))
fi

# --- Corepack / pnpm ---
if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm v$(pnpm -v)"
else
  warn "pnpm belum aktif. Jalankan: corepack enable && corepack prepare pnpm@latest --activate"
  problems=$((problems+1))
fi

# --- Docker ---
if command -v docker >/dev/null 2>&1; then
  ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
  if docker info >/dev/null 2>&1; then
    ok "Docker daemon berjalan & dapat diakses tanpa sudo"
  else
    warn "Tidak bisa akses Docker daemon. Jalankan daemon, atau: sudo usermod -aG docker \"\$USER\" lalu logout/login."
    problems=$((problems+1))
  fi
else
  err "Docker tidak ditemukan. Pasang Docker Engine dari repo resmi — lihat docs/setup-ubuntu.md."
  problems=$((problems+1))
fi

# --- Docker Compose v2 ---
if docker compose version >/dev/null 2>&1; then
  ok "Docker Compose v2 ($(docker compose version --short 2>/dev/null))"
else
  err "Plugin 'docker compose' (v2) tidak ada. Pasang docker-compose-plugin — lihat docs/setup-ubuntu.md."
  problems=$((problems+1))
fi

# --- .env ---
if [ "${1:-}" = "--env" ]; then
  if [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
    ok ".env dibuat dari .env.example — ingat ganti secret & password."
  elif [ -f .env ]; then
    ok ".env sudah ada."
  else
    warn ".env.example tidak ditemukan; lewati pembuatan .env."
  fi
fi

echo
if [ "$problems" -eq 0 ]; then
  ok "Semua prasyarat terpenuhi. Selanjutnya: cp .env.example .env && docker compose up -d && pnpm install && pnpm dev"
  exit 0
else
  err "Ada ${problems} hal yang perlu diperbaiki. Ikuti docs/setup-ubuntu.md, lalu jalankan ulang skrip ini."
  exit 1
fi
