import type { DependencyStatus, HealthStatus } from "@notion/shared";

/**
 * Agregasi status health (fungsi murni → mudah di-unit-test).
 * "ok" hanya bila SEMUA dependency up; selain itu "degraded".
 */
export function aggregateStatus(services: Record<string, DependencyStatus>): HealthStatus {
  return Object.values(services).every((s) => s === "up") ? "ok" : "degraded";
}
