import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePage, getTrash, restorePage } from "@/lib/page.api";
import { useWorkspaceStore } from "@/stores/workspace.store";

export function TrashPage() {
  const workspaceId = useWorkspaceStore((s) => s.selectedId);
  const qc = useQueryClient();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["trash", workspaceId],
    queryFn: () => getTrash(workspaceId as string),
    enabled: !!workspaceId,
  });

  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: ["trash", workspaceId] });
    void qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
  };

  const restoreMut = useMutation({
    mutationFn: (id: string) => restorePage(id),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePage(id),
    onSuccess: invalidate,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Trash2 className="h-6 w-6" /> Trash
        </h1>
        <p className="text-sm text-muted-foreground">
          Halaman terarsip. Pulihkan atau hapus permanen (menghapus juga sub-halamannya).
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {pages && pages.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Trash kosong.
        </p>
      )}

      <ul className="divide-y rounded-lg border">
        {pages?.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 p-3">
            <span className="min-w-0 flex-1 truncate text-sm">
              {p.icon ? `${p.icon} ` : ""}
              {p.title || "Untitled"}
            </span>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={restoreMut.isPending}
                onClick={() => restoreMut.mutate(p.id)}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Pulihkan
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={deleteMut.isPending}
                onClick={() => {
                  if (confirm(`Hapus permanen "${p.title || "Untitled"}" beserta sub-halamannya?`))
                    deleteMut.mutate(p.id);
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus permanen
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
