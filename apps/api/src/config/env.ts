import { z } from "zod";

/**
 * Validasi SEMUA env yang dipakai API dengan Zod (fail-fast saat boot).
 * Jangan hardcode secret — semua lewat env (lihat .env.example).
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),

  REDIS_URL: z.string().min(1).optional(),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  // Auth: access token JWT + refresh token opaque (lihat ADR 0003).
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET terlalu pendek"),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900), // detik
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(1_209_600), // detik

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Parse & cache env sekali. Melempar error deskriptif bila tidak valid. */
export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Konfigurasi env tidak valid:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
