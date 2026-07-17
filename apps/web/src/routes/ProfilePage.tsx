import { useMutation } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, updateProfile } from "@/lib/auth.api";
import { useAuthStore } from "@/stores/auth.store";

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Halaman profil user: personalisasi (nama, tema) + ganti password sendiri. */
export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name ?? "");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const profileMut = useMutation({
    mutationFn: () => updateProfile({ name: name.trim() || null }),
    onSuccess: () => setProfileMsg("Profil disimpan."),
    onError: (e) => setProfileMsg(e instanceof Error ? e.message : "Gagal menyimpan"),
  });

  const pwMut = useMutation({
    mutationFn: () => changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      setPwErr(null);
      setPwMsg("Password berhasil diganti. Sesi di perangkat lain telah dikeluarkan.");
    },
    onError: (e) => {
      setPwMsg(null);
      setPwErr(e instanceof Error ? e.message : "Gagal mengganti password");
    },
  });

  if (!user) return <p className="text-sm text-muted-foreground">Memuat…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">
          {user.email}
          {user.isSuperAdmin && (
            <span className="ml-2 inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
              <ShieldCheck className="h-3 w-3" /> Superadmin
            </span>
          )}
        </p>
      </div>

      <Section title="Identitas" icon={<UserRound className="h-4 w-4" />}>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setProfileMsg(null);
            profileMut.mutate();
          }}
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="name">Nama tampilan</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto" disabled={profileMut.isPending}>
            Simpan
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Email ({user.email}) tidak dapat diubah sendiri.
        </p>
        {profileMsg && <p className="mt-2 text-sm text-emerald-600">{profileMsg}</p>}
      </Section>

      <Section title="Tampilan" icon={<span className="text-base leading-none">🎨</span>}>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-sm text-muted-foreground">
            Pilih tema: Sistem, Terang, Gelap, Sepia, Solarized, atau Nord.
          </span>
        </div>
      </Section>

      <Section title="Ganti password" icon={<KeyRound className="h-4 w-4" />}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setPwMsg(null);
            if (next !== confirm) {
              setPwErr("Konfirmasi password tidak cocok");
              return;
            }
            setPwErr(null);
            pwMut.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="current">Password saat ini</Label>
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
          <p className="text-xs text-muted-foreground">
            Minimal 8 karakter. Setelah diganti, sesi di perangkat lain akan dikeluarkan.
          </p>
          {pwErr && <p className="text-sm text-destructive">{pwErr}</p>}
          {pwMsg && <p className="text-sm text-emerald-600">{pwMsg}</p>}
          <Button type="submit" disabled={pwMut.isPending}>
            {pwMut.isPending ? "Menyimpan…" : "Ganti password"}
          </Button>
        </form>
      </Section>
    </div>
  );
}
