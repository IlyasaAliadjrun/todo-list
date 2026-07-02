import { z } from "zod";

/** Status satu dependency (Postgres/Redis). */
export const DependencyStatusSchema = z.enum(["up", "down"]);
export type DependencyStatus = z.infer<typeof DependencyStatusSchema>;

/** Status agregat health: "ok" bila semua up, "degraded" bila ada yang down. */
export const HealthStatusSchema = z.enum(["ok", "degraded"]);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

/** Respons GET /health. Dipakai bersama oleh api & web (source of truth kontrak). */
export const HealthResponseSchema = z.object({
  status: HealthStatusSchema,
  uptime: z.number().nonnegative(),
  timestamp: z.string(),
  services: z.object({
    database: DependencyStatusSchema,
    redis: DependencyStatusSchema,
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
