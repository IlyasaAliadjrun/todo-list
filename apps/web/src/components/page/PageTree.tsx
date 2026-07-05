import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { archivePage, createPage, getPageTree, movePage, updatePage } from "@/lib/page.api";
import { SortableTreeRow } from "./SortableTreeRow";
import { flattenTree, getProjection, removeDescendants, type Projection } from "./tree-utils";

interface Props {
  workspaceId: string;
  selectedId?: string;
  onNavigate?: () => void;
}

export function PageTree({ workspaceId, selectedId, onNavigate }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);

  const { data: tree } = useQuery({
    queryKey: ["pages", workspaceId],
    queryFn: () => getPageTree(workspaceId),
  });

  const flat = useMemo(() => (tree ? flattenTree(tree, collapsed) : []), [tree, collapsed]);
  const items = useMemo(
    () => (activeId ? removeDescendants(flat, activeId) : flat),
    [flat, activeId],
  );
  const ids = useMemo(() => items.map((i) => i.id), [items]);

  const projection: Projection | null =
    activeId && overId ? getProjection(items, activeId, overId, offsetLeft) : null;

  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
  };

  const createMut = useMutation({
    mutationFn: (parentId: string | null) => createPage(workspaceId, parentId ? { parentId } : {}),
    onSuccess: (page) => {
      invalidate();
      onNavigate?.();
      void navigate({ to: "/p/$pageId", params: { pageId: page.id } });
    },
  });
  const renameMut = useMutation({
    mutationFn: (v: { id: string; title: string }) => updatePage(v.id, { title: v.title }),
    onSuccess: invalidate,
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => archivePage(id),
    onSuccess: invalidate,
  });
  const moveMut = useMutation({
    mutationFn: (v: { id: string; parentId: string | null; afterId: string | null }) =>
      movePage(v.id, { parentId: v.parentId, afterId: v.afterId }),
    onSuccess: invalidate,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function toggle(id: string): void {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function resetDrag(): void {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
  }
  function onDragStart(e: DragStartEvent): void {
    setActiveId(String(e.active.id));
    setOverId(String(e.active.id));
  }
  function onDragMove(e: DragMoveEvent): void {
    setOffsetLeft(e.delta.x);
  }
  function onDragOver(e: DragOverEvent): void {
    setOverId(e.over ? String(e.over.id) : null);
  }
  function onDragEnd(_e: DragEndEvent): void {
    const proj = projection;
    const id = activeId;
    resetDrag();
    if (id && proj) moveMut.mutate({ id, parentId: proj.parentId, afterId: proj.afterId });
  }

  const activeItem = activeId ? flat.find((i) => i.id === activeId) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Halaman
        </span>
        <button
          type="button"
          onClick={() => createMut.mutate(null)}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Halaman baru"
          title="Halaman baru"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <button
            type="button"
            onClick={() => createMut.mutate(null)}
            className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary"
          >
            + Buat halaman pertama
          </button>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={resetDrag}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableTreeRow
                  key={item.id}
                  item={item}
                  depth={activeId === item.id && projection ? projection.depth : item.depth}
                  selected={item.id === selectedId}
                  onToggle={toggle}
                  onAddChild={(pid) => createMut.mutate(pid)}
                  onArchive={(pid) => {
                    archiveMut.mutate(pid);
                    if (pid === selectedId) void navigate({ to: "/" });
                  }}
                  onRename={(pid, title) => renameMut.mutate({ id: pid, title })}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeItem ? (
                <div className="rounded-md bg-background px-2 py-1 text-sm shadow ring-1 ring-border">
                  {activeItem.icon ?? "📄"} {activeItem.title || "Untitled"}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <Link
        to="/trash"
        onClick={() => onNavigate?.()}
        className="mt-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        activeProps={{ className: "bg-secondary text-foreground" }}
      >
        <Trash2 className="h-4 w-4" /> Trash
      </Link>
    </div>
  );
}
