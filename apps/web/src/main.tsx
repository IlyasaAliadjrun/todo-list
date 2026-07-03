import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { router } from "@/app/router";
import { refreshSession } from "@/lib/http";
import { useAuthStore } from "@/stores/auth.store";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5_000 },
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
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </React.StrictMode>,
);
