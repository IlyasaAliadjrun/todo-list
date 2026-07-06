import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { UpdatePageInput } from "@notion/shared";
import { useEffect, useState } from "react";
import { PageEditor } from "@/components/page/PageEditor";
import { getPage, updatePage } from "@/lib/page.api";

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

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (isError || !page) return <p className="text-sm text-destructive">Halaman tidak ditemukan.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <input
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        onBlur={() => {
          const next = icon.trim() || null;
          if (next !== page.icon) saveMut.mutate({ icon: next });
        }}
        maxLength={4}
        placeholder="🙂"
        aria-label="Ikon halaman (emoji)"
        className="h-14 w-14 rounded-md border border-input bg-background text-center text-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

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
        className="w-full bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground"
      />

      <PageEditor key={page.id} pageId={page.id} initialContent={page.content} />
    </div>
  );
}
