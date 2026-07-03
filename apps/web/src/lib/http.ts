import { AuthResponseSchema } from "@notion/shared";
import type { ZodSchema } from "zod";
import { useAuthStore } from "@/stores/auth.store";

/** Error API dengan kode & status dari bentuk respons seragam backend. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function rawFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  return fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

let refreshInFlight: Promise<boolean> | null = null;

/** Tukar cookie refresh → access token baru. Di-dedupe agar hanya 1 request berjalan. */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/auth/refresh", { method: "POST", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = AuthResponseSchema.parse(await res.json());
        useAuthStore.getState().setSession(data.accessToken, data.user);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Fetch JSON dengan auth header + auto-refresh sekali saat 401. */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  schema?: ZodSchema<T>,
): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && path !== "/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await rawFetch(path, options);
    } else {
      useAuthStore.getState().clearSession();
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new ApiError(
      body?.error?.message ?? `HTTP ${res.status}`,
      body?.error?.code ?? "ERROR",
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  const json: unknown = await res.json();
  return schema ? schema.parse(json) : (json as T);
}
