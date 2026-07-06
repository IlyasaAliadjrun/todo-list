import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { UpdatePageInput } from "@notion/shared";
import { Lock, Share2, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { PageEditor } from "@/components/page/PageEditor";
import { ShareDialog } from "@/components/page/ShareDialog";
import { Button } from "@/components/ui/button";
import { addFavorite, removeFavorite } from "@/lib/favorite.api";
import { getPage, updatePage } from "@/lib/page.api";
import { cn } from "@/lib/utils";

export function PageDetail() {
  const params = useParams({ strict: false });
  const pageId = params.pageId as string;
  const qc = useQueryClient();

  const {
    data: page,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["page", pageId], queryFn: () => getPage(pageId), enabled: !!pageId });

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setIcon(page.icon ?? "");
    }
  }, [page?.id]);

  const saveMut = useMutation({
    mutationFn: (input: UpdatePageInput) => updatePage(pageId, input),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ["page", pageId] });
      void qc.invalidateQueries({ queryKey: ["pages", updated.workspaceId] });
    },
  });

  const favMut = useMutation({
    mutationFn: (currentlyFav: boolean) =>
      currentlyFav ? removeFavorite(pageId) : addFavorite(pageId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["page", pageId] });
      void qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (isError || !page) return <p className="text-sm text-destructive">Halaman tidak ditemukan.</p>;

  const canEdit = page.myLevel === "EDIT";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-2">
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          onBlur={() => {
            const next = icon.trim() || null;
            if (next !== page.icon) saveMut.mutate({ icon: next });
          }}
          maxLength={4}
          placeholder="🙂"
          readOnly={!canEdit}
          aria-label="Ikon halaman (emoji)"
          className="h-14 w-14 rounded-md border border-input bg-background text-center text-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        <div className="flex items-center gap-2">
          {!canEdit && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              {page.myLevel === "VIEW" ? "Hanya lihat" : "Bisa komentar"}
            </span>
          )}
          <button
            type="button"
            onClick={() => favMut.mutate(page.isFavorite)}
            aria-label={page.isFavorite ? "Hapus dari favorit" : "Tambah ke favorit"}
            title={page.isFavorite ? "Hapus dari favorit" : "Tambah ke favorit"}
            className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-secondary"
          >
            <Star
              className={cn(
                "h-4 w-4",
                page.isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
              )}
            />
          </button>
          <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-1 h-3.5 w-3.5" /> Bagikan
          </Button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          const next = title.trim() || "Untitled";
          if (next !== page.title) saveMut.mutate({ title: next });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="Untitled"
        readOnly={!canEdit}
        className="w-full bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground"
      />

      <PageEditor key={page.id} pageId={page.id} initialContent={page.content} editable={canEdit} />

      {shareOpen && <ShareDialog pageId={page.id} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
