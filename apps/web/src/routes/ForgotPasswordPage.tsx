import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/lib/auth.api";

/** Minta link reset password. Respons server sengaja seragam (tak bocorkan email terdaftar). */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword({ email });
    } finally {
      setLoading(false);
      setSent(true); // seragam: sukses/gagal tampil sama
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">Lupa password</h1>
          <p className="text-sm text-muted-foreground">
            Masukkan emailmu. Kami kirim tautan untuk membuat password baru.
          </p>
        </div>

        {sent ? (
          <>
            <p className="rounded-md bg-secondary p-3 text-sm">
              Jika email tersebut terdaftar, tautan reset sudah dikirim. Cek kotak masuk (dan
              folder spam). Tautan berlaku 1 jam.
            </p>
            <Link to="/login" className="block text-center text-sm font-medium underline">
              Kembali ke Masuk
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Mengirim…" : "Kirim tautan reset"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Ingat passwordmu?{" "}
              <Link to="/login" className="font-medium text-foreground underline">
                Masuk
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
