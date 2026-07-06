import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PermissionLevel, PermissionSubject, SetPagePermissionInput } from "@notion/shared";
import { Copy, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPermissions, removePermission, setPermission } from "@/lib/permission.api";

const LEVELS: { value: PermissionLevel; label: string }[] = [
  { value: "VIEW", label: "Bisa lihat" },
  { value: "COMMENT", label: "Bisa komentar" },
  { value: "EDIT", label: "Bisa edit" },
];

export function ShareDialog({ pageId, onClose }: { pageId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["permissions", pageId],
    queryFn: () => getPermissions(pageId),
  });

  const [subjectType, setSubjectType] = useState<PermissionSubject>("USER");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<PermissionLevel>("EDIT");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const invalidate = (res?: unknown): void => {
    if (res) qc.setQueryData(["permissions", pageId], res);
    void qc.invalidateQueries({ queryKey: ["page", pageId] });
  };

  const setMut = useMutation({
    mutationFn: (input: SetPagePermissionInput) => setPermission(pageId, input),
    onSuccess: (res) => {
      invalidate(res);
      setEmail("");
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Gagal menambah akses"),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => removePermission(pageId, id),
    onSuccess: (res) => invalidate(res),
  });

  const canManage = data?.canManage ?? false;

  function copyLink(): void {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bagikan halaman</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {canManage && (
          <form
            className="mb-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setMut.mutate(
                subjectType === "WORKSPACE"
                  ? { subjectType: "WORKSPACE", level }
                  : { subjectType: "USER", email: email.trim(), level },
              );
            }}
          >
            <div className="flex flex-wrap gap-2">
              <select
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value as PermissionSubject)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="USER">Orang</option>
                <option value="WORKSPACE">Semua anggota</option>
              </select>
              {subjectType === "USER" && (
                <Input
                  type="email"
                  required
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 min-w-0 flex-1"
                />
              )}
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as PermissionLevel)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" className="w-full" disabled={setMut.isPending}>
              Tambah akses
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        )}

        <ul className="mb-3 space-y-1">
          {data && data.permissions.length === 0 && (
            <li className="rounded-md bg-secondary p-2 text-xs text-muted-foreground">
              Belum ada akses khusus — semua anggota workspace bisa mengedit (default).
            </li>
          )}
          {data?.permissions.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{p.label}</span>
              {canManage ? (
                <>
                  <select
                    value={p.level}
                    onChange={(e) =>
                      setMut.mutate({
                        subjectType: p.subjectType,
                        subjectId: p.subjectId,
                        level: e.target.value as PermissionLevel,
                      })
                    }
                    className="h-8 rounded-md border border-input bg-background px-1 text-xs"
                  >
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMut.mutate(p.id)}
                    aria-label="Cabut akses"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {LEVELS.find((l) => l.value === p.level)?.label}
                </span>
              )}
            </li>
          ))}
        </ul>

        <Button type="button" variant="outline" size="sm" className="w-full" onClick={copyLink}>
          <Copy className="mr-1 h-3.5 w-3.5" /> {copied ? "Tersalin!" : "Salin link halaman"}
        </Button>
      </div>
    </div>
  );
}
