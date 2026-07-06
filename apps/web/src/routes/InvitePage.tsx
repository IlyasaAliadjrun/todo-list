import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { acceptInvitation } from "@/lib/workspace.api";
import { useAuthStore } from "@/stores/auth.store";
import { useWorkspaceStore } from "@/stores/workspace.store";

export const PENDING_INVITE_KEY = "pendingInvite";

/**
 * Halaman tujuan link undangan email (/invite?token=…).
 * - Belum login → simpan token, arahkan ke daftar/login (akan kembali ke sini).
 * - Sudah login → terima undangan lalu buka workspace.
 */
export function InvitePage() {
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const select = useWorkspaceStore((s) => s.select);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get("token");
    const token = urlToken || sessionStorage.getItem(PENDING_INVITE_KEY) || "";
    if (!token) {
      void navigate({ to: "/" });
      return;
    }
    if (status === "loading") return; // tunggu pemulihan sesi
    if (status !== "authed") {
      sessionStorage.setItem(PENDING_INVITE_KEY, token);
      void navigate({ to: "/register" });
      return;
    }
    acceptInvitation({ token })
      .then((ws) => {
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        select(ws.id);
        void navigate({ to: "/" });
      })
      .catch((e: unknown) => {
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        setError(e instanceof Error ? e.message : "Undangan tidak valid atau kedaluwarsa");
      });
  }, [status, navigate, select]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center">
        {error ? (
          <>
            <p className="mb-3 text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => void navigate({ to: "/" })}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"
            >
              Ke beranda
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Memproses undangan…</p>
        )}
      </div>
    </main>
  );
}
