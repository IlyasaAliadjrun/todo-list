import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FilePlus2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createPage, getPageTree } from "@/lib/page.api";
import { useWorkspaceStore } from "@/stores/workspace.store";

/**
 * Landing default: buka halaman pertama workspace bila ada, selain itu tampilkan
 * ajakan membuat halaman. Konfigurasi workspace dipindah ke /settings (ikon gear).
 */
export function HomePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore((s) => s.selectedId);

  const { data: tree, isLoading } = useQuery({
    queryKey: ["pages", workspaceId],
    queryFn: () => getPageTree(workspaceId!),
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (tree && tree.length > 0) {
      void navigate({ to: "/p/$pageId", params: { pageId: tree[0].id }, replace: true });
    }
  }, [tree, navigate]);

  const createMut = useMutation({
    mutationFn: () => createPage(workspaceId!, {}),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
      void navigate({ to: "/p/$pageId", params: { pageId: p.id } });
    },
  });

  if (isLoading || (tree && tree.length > 0)) {
    return <p className="text-sm text-muted-foreground">Memuat…</p>;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="text-4xl">👋</div>
      <div>
        <h1 className="text-xl font-bold">Selamat datang</h1>
        <p className="text-sm text-muted-foreground">
          Belum ada halaman di workspace ini. Buat halaman pertamamu untuk mulai menulis.
        </p>
      </div>
      <Button onClick={() => createMut.mutate()} disabled={!workspaceId || createMut.isPending}>
        <FilePlus2 className="mr-1.5 h-4 w-4" />
        {createMut.isPending ? "Membuat…" : "Buat halaman"}
      </Button>
    </div>
  );
}
