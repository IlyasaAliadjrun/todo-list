import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { INDENT_WIDTH, type FlatItem } from "./tree-utils";

interface Props {
  item: FlatItem;
  depth: number;
  selected: boolean;
  onToggle: (id: string) => void;
  onAddChild: (id: string) => void;
  onArchive: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function SortableTreeRow({
  item,
  depth,
  selected,
  onToggle,
  onAddChild,
  onArchive,
  onRename,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== item.title) onRename(item.id, next);
    else setDraft(item.title);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-0.5 rounded-md pr-1 text-sm",
        selected ? "bg-secondary" : "hover:bg-secondary/60",
        isDragging && "opacity-50",
      )}
    >
      <div style={{ width: depth * INDENT_WIDTH }} className="shrink-0" />

      <button
        type="button"
        onClick={() => onToggle(item.id)}
        className={cn(
          "flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground",
          !item.hasChildren && "invisible",
        )}
        aria-label={item.collapsed ? "Buka" : "Tutup"}
      >
        {item.collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      <span
        {...attributes}
        {...listeners}
        className="flex h-6 w-5 shrink-0 cursor-grab items-center justify-center touch-none"
        aria-label="Seret untuk memindah"
      >
        {item.icon ? (
          <span className="text-sm leading-none">{item.icon}</span>
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
      </span>

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(item.title);
              setEditing(false);
            }
          }}
          className="h-6 min-w-0 flex-1 rounded border border-input bg-background px-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <Link
          to="/p/$pageId"
          params={{ pageId: item.id }}
          onDoubleClick={() => {
            setDraft(item.title);
            setEditing(true);
          }}
          className="min-w-0 flex-1 truncate py-1"
          title="Klik dua kali untuk ganti nama"
        >
          {item.title || "Untitled"}
        </Link>
      )}

      <button
        type="button"
        onClick={() => onAddChild(item.id)}
        className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground group-hover:flex"
        aria-label="Tambah sub-halaman"
        title="Sub-halaman"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onArchive(item.id)}
        className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-destructive group-hover:flex"
        aria-label="Pindahkan ke trash"
        title="Hapus ke trash"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
