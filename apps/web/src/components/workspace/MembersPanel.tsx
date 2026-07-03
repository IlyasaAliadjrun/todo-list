import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssignableRole, WorkspaceRole } from "@notion/shared";
import { Button } from "@/components/ui/button";
import { listMembers, removeMember, updateMemberRole } from "@/lib/workspace.api";
import { useAuthStore } from "@/stores/auth.store";

export function MembersPanel({ workspaceId, myRole }: { workspaceId: string; myRole: WorkspaceRole }) {
  const qc = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const { data: members, isLoading } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => listMembers(workspaceId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["members", workspaceId] });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: AssignableRole }) =>
      updateMemberRole(workspaceId, vars.userId, { role: vars.role }),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: invalidate,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat anggota…</p>;
  if (!members) return null;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 font-medium">Anggota</th>
          <th className="py-2 font-medium">Role</th>
          {canManage && <th className="py-2" />}
        </tr>
      </thead>
      <tbody>
        {members.map((m) => {
          const isSelf = m.userId === currentUserId;
          const editable = canManage && m.role !== "OWNER" && !isSelf;
          return (
            <tr key={m.userId} className="border-b last:border-0">
              <td className="py-2">
                <div className="font-medium">{m.name ?? m.email}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
              </td>
              <td className="py-2">
                {editable ? (
                  <select
                    value={m.role}
                    disabled={roleMutation.isPending}
                    onChange={(e) =>
                      roleMutation.mutate({ userId: m.userId, role: e.target.value as AssignableRole })
                    }
                    className="h-8 rounded-md border border-input bg-background px-2"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                ) : (
                  <span className="rounded bg-secondary px-2 py-1 text-xs font-medium">{m.role}</span>
                )}
              </td>
              {canManage && (
                <td className="py-2 text-right">
                  {editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(m.userId)}
                    >
                      Hapus
                    </Button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
