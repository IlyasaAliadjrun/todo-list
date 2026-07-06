import { defineConfig } from "@playwright/test";

/**
 * E2E alur inti. Menjalankan stack dev (api+web) via webServer bila belum jalan.
 * Butuh layanan data (postgres/redis/minio) hidup + .env terisi.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    launchOptions: { args: ["--no-sandbox"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "cd ../.. && pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
