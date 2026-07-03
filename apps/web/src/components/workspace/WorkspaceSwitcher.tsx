import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { listWorkspaces } from "@/lib/workspace.api";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace.store";

export function WorkspaceSwitcher() {
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: listWorkspaces });
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const select = useWorkspaceStore((s) => s.select);

  useEffect(() => {
    if (workspaces?.length) {
      const stillExists = workspaces.some((w) => w.id === selectedId);
      if (!selectedId || !stillExists) select(workspaces[0].id);
    }
  }, [workspaces, selectedId, select]);

  if (!workspaces?.length) return null;

  return (
    <select
      aria-label="Pilih workspace"
      value={selectedId ?? ""}
      onChange={(e) => select(e.target.value)}
      className={cn(
        "h-9 rounded-md border border-input bg-background px-3 text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {workspaces.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name} {w.type === "PERSONAL" ? "(pribadi)" : ""}
        </option>
      ))}
    </select>
  );
}
