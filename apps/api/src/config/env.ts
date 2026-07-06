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

  // Object storage S3-compatible (MinIO lokal). Lihat ADR 0005.
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("notion-uploads"),
  // Default = kredensial dev MinIO (docker-compose). WAJIB di-override di produksi.
  S3_ACCESS_KEY: z.string().min(1).default("minioadmin"),
  S3_SECRET_KEY: z.string().min(1).default("minioadmin"),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
  // Endpoint yang dipakai untuk URL yang diakses BROWSER (presigned & publicUrl).
  // Di dev sama dengan S3_ENDPOINT; di container internal beda dengan yang publik.
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  // Rate limit global (request per menit per IP) — anti-abuse kasar.
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(600),
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
