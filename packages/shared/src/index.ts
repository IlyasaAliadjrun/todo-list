/**
 * @notion/shared — tipe & skema Zod bersama web/api.
 * Sumber kebenaran kontrak API. Impor dari "@notion/shared".
 *
 * Re-export EKSPLISIT (bukan `export *`) agar named export terdeteksi oleh
 * bundler (Rollup/Vite) saat paket ini dikonsumsi sebagai CommonJS.
 */
export { ApiErrorSchema, ErrorCode, apiError } from "./http/error";
export type { ApiError } from "./http/error";

export {
  DependencyStatusSchema,
  HealthStatusSchema,
  HealthResponseSchema,
} from "./health/health";
export type { DependencyStatus, HealthStatus, HealthResponse } from "./health/health";
