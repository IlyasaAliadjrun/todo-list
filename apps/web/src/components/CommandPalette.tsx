import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { createPage } from "@/lib/page.api";
import { searchPages } from "@/lib/search.api";
import { useWorkspaceStore } from "@/stores/workspace.store";

/** Render snippet ts_headline (<b>…</b>) dengan aman (tanpa innerHTML). */
function renderSnippet(snippet: string): ReactNode {
  return snippet.split(/(<b>.*?<\/b>)/g).map((part, i) => {
    const m = /^<b>(.*)<\/b>$/.exec(part);
    return m ? (
      <mark key={i} className="bg-transparent font-semibold text-foreground">
        {m[1]}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    );
  });
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const workspaceId = useWorkspaceStore((s) => s.selectedId);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const openEvt = (): void => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", openEvt);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", openEvt);
    };
  }, []);

  const { data: results } = useQuery({
    queryKey: ["search", workspaceId, q],
    queryFn: () => searchPages(workspaceId as string, q),
    enabled: open && !!workspaceId && q.trim().length > 0,
  });

  function close(): void {
    setOpen(false);
    setQ("");
  }
  function goto(pageId: string): void {
    close();
    void navigate({ to: "/p/$pageId", params: { pageId } });
  }
  async function newPage(): Promise<void> {
    if (!workspaceId) return;
    const page = await createPage(workspaceId);
    close();
    void navigate({ to: "/p/$pageId", params: { pageId: page.id } });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[14vh]"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-lg border bg-background shadow-xl"
      >
        <Command shouldFilter={false} label="Command Menu">
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Cari halaman atau aksi…"
            className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-80 overflow-y-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {q.trim() ? "Tidak ada hasil." : "Ketik untuk mencari halaman…"}
            </Command.Empty>

            {results && results.length > 0 && (
              <Command.Group
                heading="Halaman"
                className="px-1 py-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
              >
                {results.map((r) => (
                  <Command.Item
                    key={r.id}
                    value={r.id}
                    onSelect={() => goto(r.id)}
                    className="flex cursor-pointer flex-col gap-0.5 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-secondary"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {r.icon ? <span>{r.icon}</span> : <FileText className="h-3.5 w-3.5" />}
                      {r.title || "Untitled"}
                    </span>
                    <span className="truncate pl-6 text-xs text-muted-foreground">
                      {renderSnippet(r.snippet)}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading="Aksi"
              className="px-1 py-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
            >
              <Command.Item
                value="__new"
                onSelect={() => void newPage()}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-secondary"
              >
                <Plus className="h-4 w-4" /> Halaman baru
              </Command.Item>
              <Command.Item
                value="__trash"
                onSelect={() => {
                  close();
                  void navigate({ to: "/trash" });
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-secondary"
              >
                <Trash2 className="h-4 w-4" /> Buka Trash
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
