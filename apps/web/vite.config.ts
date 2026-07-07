import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const API_TARGET = process.env.VITE_API_PROXY ?? "http://localhost:3001";
const WEB_PORT = Number(process.env.WEB_PORT ?? 5173);

// Host yang boleh mengakses dev server. Default mengizinkan subdomain tunnel umum
// (Cloudflare Tunnel/ngrok) untuk pengujian tanpa IP publik; tambah host sendiri
// lewat VITE_ALLOWED_HOSTS (dipisah koma), mis. domain mail/tunnel milikmu.
const extraHosts = (process.env.VITE_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);
const allowedHosts = [".trycloudflare.com", ".ngrok-free.app", ".ngrok.io", ...extraHosts];

// HMR (hot-reload) via tunnel: quick-tunnel Cloudflare tak andal membawa WebSocket HMR,
// dan badai reconnect-nya bisa membebani tunnel (memicu 530 pada request asli).
//  - VITE_DISABLE_HMR=true  → matikan HMR sepenuhnya (disarankan saat akses via tunnel).
//  - VITE_HMR_CLIENT_PORT=n → browser konek HMR di port n (mis. 443 di balik TLS).
//  - keduanya kosong        → perilaku lokal biasa.
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? Number(process.env.VITE_HMR_CLIENT_PORT)
  : undefined;
const hmr =
  process.env.VITE_DISABLE_HMR === "true"
    ? false
    : hmrClientPort
      ? { protocol: "wss", clientPort: hmrClientPort }
      : undefined;

// Semua prefix rute REST milik API di-proxy ke NestJS (same-origin → cookie mulus).
const apiProxy: Record<string, string | { target: string; ws?: boolean }> = Object.fromEntries(
  [
    "/health",
    "/api",
    "/auth",
    "/workspaces",
    "/invitations",
    "/pages",
    "/databases",
    "/properties",
    "/rows",
    "/uploads",
  ].map((p) => [p, API_TARGET]),
);
// WebSocket kolaborasi (Hocuspocus) — perlu upgrade ws.
apiProxy["/collab"] = { target: API_TARGET, ws: true };

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Konsumsi paket internal dari SOURCE agar Vite/Rollup mengompilasi TS
      // langsung (menghindari masalah interop named-export CommonJS).
      "@notion/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    host: true,
    port: WEB_PORT,
    allowedHosts,
    hmr,
    // Proxy panggilan API ke NestJS saat dev agar tidak kena CORS & cookie beda origin.
    proxy: apiProxy,
  },
  // `vite preview` (dipakai container web) juga memproxy ke API via VITE_API_PROXY.
  preview: {
    port: WEB_PORT,
    allowedHosts,
    proxy: apiProxy,
  },
});
