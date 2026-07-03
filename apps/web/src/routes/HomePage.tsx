import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssignableRole } from "@notion/shared";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MembersPanel } from "@/components/workspace/MembersPanel";
import {
  acceptInvitation,
  createWorkspace,
  inviteMember,
  listWorkspaces,
} from "@/lib/workspace.api";
import { useWorkspaceStore } from "@/stores/workspace.store";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function HomePage() {
  const qc = useQueryClient();
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const select = useWorkspaceStore((s) => s.select);
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: listWorkspaces });
  const selected = workspaces?.find((w) => w.id === selectedId) ?? null;

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AssignableRole>("MEMBER");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [wsName, setWsName] = useState("");
  const [token, setToken] = useState("");
  const [acceptMsg, setAcceptMsg] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const inviteMut = useMutation({
    mutationFn: () => inviteMember(selected!.id, { email: inviteEmail, role: inviteRole }),
    onSuccess: (inv) => {
      setInviteToken(inv.token ?? null);
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["members", selected!.id] });
    },
    onError: (e) => setInviteError(e instanceof Error ? e.message : "Gagal mengundang"),
  });

  const createMut = useMutation({
    mutationFn: () => createWorkspace({ name: wsName }),
    onSuccess: (ws) => {
      setWsName("");
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      select(ws.id);
    },
  });

  const acceptMut = useMutation({
    mutationFn: () => acceptInvitation({ token }),
    onSuccess: (ws) => {
      setToken("");
      setAcceptMsg(`Berhasil bergabung ke "${ws.name}"`);
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      select(ws.id);
    },
    onError: (e) => setAcceptError(e instanceof Error ? e.message : "Gagal menerima undangan"),
  });

  if (!selected) return <p className="text-sm text-muted-foreground">Memuat workspace…</p>;
  const canManage = selected.role === "OWNER" || selected.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{selected.name}</h1>
        <p className="text-sm text-muted-foreground">
          {selected.type === "PERSONAL" ? "Workspace pribadi" : "Workspace tim"} · role kamu:{" "}
          <span className="font-medium text-foreground">{selected.role}</span>
        </p>
      </div>

      <Section title="Anggota">
        <MembersPanel workspaceId={selected.id} myRole={selected.role} />
      </Section>

      {canManage && (
        <Section title="Undang anggota">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setInviteError(null);
              setInviteToken(null);
              inviteMut.mutate();
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email" className="block">
                Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="nama@contoh.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:w-36">
              <Label htmlFor="invite-role" className="block">
                Role
              </Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as AssignableRole)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={inviteMut.isPending}>
              Undang
            </Button>
          </form>
          {inviteError && <p className="mt-2 text-sm text-destructive">{inviteError}</p>}
          {inviteToken && (
            <div className="mt-3 rounded-md bg-secondary p-3 text-sm">
              <p className="mb-1 font-medium">Token undangan (belum ada email di Fase 1):</p>
              <code className="block break-all rounded bg-background px-2 py-1 text-xs">
                {inviteToken}
              </code>
              <p className="mt-1 text-xs text-muted-foreground">
                Bagikan token ini; penerima login lalu tempel di &quot;Terima undangan&quot;.
              </p>
            </div>
          )}
        </Section>
      )}

      <Section title="Buat workspace tim">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="ws-name">Nama workspace</Label>
            <Input
              id="ws-name"
              required
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto" disabled={createMut.isPending}>
            Buat
          </Button>
        </form>
      </Section>

      <Section title="Terima undangan">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setAcceptError(null);
            setAcceptMsg(null);
            acceptMut.mutate();
          }}
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="accept-token">Token undangan</Label>
            <Input
              id="accept-token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={acceptMut.isPending}
          >
            Terima
          </Button>
        </form>
        {acceptError && <p className="mt-2 text-sm text-destructive">{acceptError}</p>}
        {acceptMsg && <p className="mt-2 text-sm text-emerald-600">{acceptMsg}</p>}
      </Section>
    </div>
  );
}
