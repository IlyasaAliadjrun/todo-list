import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminUser } from "@notion/shared";
import { KeyRound, LogOut, ShieldCheck, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteUser, listUsers, revokeUserSessions, setUserPassword } from "@/lib/admin.api";
import { useAuthStore } from "@/stores/auth.store";

function PasswordForm({ user, onDone }: { user: AdminUser; onDone: (msg: string) => void }) {
  const [pw, setPw] = useState("");
  const mut = useMutation({
    mutationFn: () => setUserPassword(user.id, pw),
    onSuccess: () => {
      setPw("");
      onDone(`Password ${user.email} diganti; semua sesinya dikeluarkan.`);
    },
    onError: (e) => onDone(e instanceof Error ? e.message : "Gagal"),
  });
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate();
      }}
    >
      <Input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Password baru"
        minLength={8}
        required
        className="h-8 w-40"
      />
      <Button type="submit" size="sm" variant="outline" disabled={mut.isPending}>
        <KeyRound className="mr-1 h-3.5 w-3.5" /> Set
      </Button>
    </form>
  );
}

/** Panel superadmin: kelola user (reset password, cabut sesi, hapus). */
export function AdminPage() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [msg, setMsg] = useState<string | null>(null);
  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listUsers,
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-users"] });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeUserSessions(id),
    onSuccess: (r) => {
      setMsg(`${r.revoked} sesi dicabut.`);
      refresh();
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      setMsg("User dihapus.");
      refresh();
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : "Gagal menghapus"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (isError)
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Butuh hak superadmin."}
      </p>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-5 w-5" /> Panel Superadmin
        </h1>
        <p className="text-sm text-muted-foreground">
          Status superadmin hanya dari <code>SUPERADMIN_EMAILS</code> di env — tak bisa diubah dari
          halaman ini.
        </p>
      </div>

      {msg && <p className="rounded-md bg-secondary p-2 text-sm">{msg}</p>}

      <section className="rounded-lg border bg-card">
        <h2 className="flex items-center gap-2 border-b p-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="h-4 w-4" /> Pengguna ({users?.length ?? 0})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="p-2 font-medium">User</th>
                <th className="p-2 font-medium">Workspace</th>
                <th className="p-2 font-medium">Sesi aktif</th>
                <th className="p-2 font-medium">Set password</th>
                <th className="p-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="p-2">
                    <div className="font-medium">
                      {u.name || u.email}
                      {u.isSuperAdmin && (
                        <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                          superadmin
                        </span>
                      )}
                      {u.id === me?.id && (
                        <span className="ml-1 text-xs text-muted-foreground">(kamu)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="p-2 text-muted-foreground">{u.workspaceCount}</td>
                  <td className="p-2 text-muted-foreground">{u.activeSessions}</td>
                  <td className="p-2">
                    <PasswordForm user={u} onDone={setMsg} />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Keluarkan dari semua perangkat"
                        onClick={() => revokeMut.mutate(u.id)}
                        disabled={u.activeSessions === 0}
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title={
                          u.isSuperAdmin
                            ? "Superadmin tak bisa dihapus"
                            : u.id === me?.id
                              ? "Tak bisa menghapus diri sendiri"
                              : "Hapus user"
                        }
                        disabled={u.isSuperAdmin || u.id === me?.id}
                        onClick={() => {
                          if (confirm(`Hapus ${u.email}? Semua datanya ikut terhapus.`))
                            delMut.mutate(u.id);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
