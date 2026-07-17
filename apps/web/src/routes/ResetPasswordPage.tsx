import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth.api";

/** Halaman dari tautan email: /reset-password?token=… */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t) setToken(t);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, newPassword: next });
      setDone(true);
      setTimeout(() => void navigate({ to: "/login" }), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mereset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">Buat password baru</h1>
          <p className="text-sm text-muted-foreground">
            Tautan berlaku 1 jam dan hanya bisa dipakai sekali.
          </p>
        </div>

        {done ? (
          <p className="rounded-md bg-secondary p-3 text-sm text-emerald-600">
            Password berhasil diganti. Mengalihkan ke halaman masuk…
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {!token && (
              <div className="space-y-2">
                <Label htmlFor="token">Token reset</Label>
                <Input
                  id="token"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Tempel token dari email"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="next">Password baru</Label>
              <Input
                id="next"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Ulangi password baru</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? "Menyimpan…" : "Simpan password baru"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-foreground underline">
                Kembali ke Masuk
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
