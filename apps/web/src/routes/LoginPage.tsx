import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth.api";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-bold">Masuk</h1>
          <p className="text-sm text-muted-foreground">Selamat datang kembali.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Memproses…" : "Masuk"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link to="/register" className="font-medium text-foreground underline">
            Daftar
          </Link>
        </p>
      </form>
    </main>
  );
}
