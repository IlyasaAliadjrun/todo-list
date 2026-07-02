import { HealthResponseSchema, type HealthResponse } from "@notion/shared";

/** Ambil status health dari API dan validasi bentuknya dengan skema bersama. */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch("/health", { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Health request gagal: HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  return HealthResponseSchema.parse(json);
}
