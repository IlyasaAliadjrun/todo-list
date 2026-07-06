import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const API_TARGET = process.env.VITE_API_PROXY ?? "http://localhost:3001";
const WEB_PORT = Number(process.env.WEB_PORT ?? 5173);

// Semua prefix rute REST milik API di-proxy ke NestJS (same-origin → cookie mulus).
const apiProxy = Object.fromEntries(
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Konsumsi paket internal dari SOURCE agar Vite/Rollup mengompilasi TS
      // langsung (menghindari masalah interop named-export CommonJS).
      "@notion/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: WEB_PORT,
    // Proxy panggilan API ke NestJS saat dev agar tidak kena CORS & cookie beda origin.
    proxy: apiProxy,
  },
  // `vite preview` (dipakai container web) juga memproxy ke API via VITE_API_PROXY.
  preview: {
    port: WEB_PORT,
    proxy: apiProxy,
  },
});
