import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { router } from "@/app/router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ApiError, refreshSession } from "@/lib/http";
import { useAuthStore } from "@/stores/auth.store";
// Side-effect: menerapkan tema (light/dark) sedini mungkin untuk hindari flash.
import "@/stores/theme.store";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      // Retry dengan backoff eksponensial; jangan retry error klien (4xx).
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
    },
    mutations: { retry: 0 },
  },
});

/** Pulihkan sesi via /auth/refresh sebelum menampilkan router (hindari flash guard). */
function Root() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    void (async () => {
      const ok = await refreshSession();
      if (!ok) useAuthStore.getState().clearSession();
    })();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Memuat…
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Elemen #root tidak ditemukan");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
