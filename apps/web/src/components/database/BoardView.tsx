import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Database, DatabaseProperty } from "@notion/shared";
import { groupRowsByOption } from "@notion/shared";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { addRow, deleteRow, moveRow, setCell } from "@/lib/database.api";
import { RecordCard, optionBadgeClass, withCell, withoutRow, type RunFn } from "./database-shared";

const NULL_COL = "__none__";
type ColMap = Record<string, string[]>; // colKey -> rowIds (urut tampil)

function SortableCard({
  id,
  onClick,
  children,
}: {
  id: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // Saat diseret, kartu asli jadi placeholder (gap kosong bergaris); yang
      // terlihat bergerak adalah DragOverlay.
      className={
        isDragging
          ? "rounded-md border border-dashed border-primary/40 bg-primary/5 opacity-60"
          : "cursor-grab touch-none active:cursor-grabbing"
      }
    >
      {isDragging ? <div className="invisible">{children}</div> : children}
    </div>
  );
}

function Column({
  id,
  label,
  color,
  count,
  onAdd,
  children,
}: {
  id: string;
  label: string;
  color?: string;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${optionBadgeClass(color)}`}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-16 flex-col gap-2 rounded-md p-1.5 transition-colors ${
          isOver ? "bg-secondary" : "bg-muted/40"
        }`}
      >
        {children}
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-left text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Baru
        </button>
      </div>
    </div>
  );
}

export function BoardView({
  db,
  run,
  groupByProperty,
  cellOf,
  onOpenRow,
}: {
  db: Database;
  run: RunFn;
  groupByProperty: DatabaseProperty | null;
  cellOf: (rowId: string, propId: string) => unknown;
  onOpenRow: (rowId: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const draggingRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const groupById = groupByProperty?.id ?? "";
  const optionIds = groupByProperty?.options.map((o) => o.id) ?? [];
  const colKeys = [...optionIds, NULL_COL];

  // Susunan kolom→kartu. Diturunkan dari db saat tidak sedang men-drag; selama
  // drag di-mutasi lokal agar placeholder & reorder terlihat langsung.
  function derive(): ColMap {
    const map: ColMap = {};
    for (const c of groupRowsByOption(db.rows, cellOf, groupById, optionIds)) {
      map[c.optionId ?? NULL_COL] = c.rowIds;
    }
    return map;
  }
  const [cols, setCols] = useState<ColMap>(derive);
  // Sinkronkan dari db saat tidak sedang men-drag (derive stabil per-render db).
  const deriveRef = useRef(derive);
  deriveRef.current = derive;
  useEffect(() => {
    if (!activeId) setCols(deriveRef.current());
  }, [db, activeId]);

  if (!groupByProperty) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Pilih properti <span className="font-medium text-foreground">Select</span> untuk
        dikelompokkan (menu “Kelompokkan” di atas). Belum punya? Tambah kolom bertipe Select di
        Table view.
      </div>
    );
  }

  const colOf = (rowId: string): string | undefined =>
    colKeys.find((k) => cols[k]?.includes(rowId));
  const keyToOption = (k: string): string => (k === NULL_COL ? "" : k);
  const labelOf = (k: string): { text: string; color?: string } => {
    if (k === NULL_COL) return { text: `Tanpa ${groupByProperty.name}` };
    const opt = groupByProperty.options.find((o) => o.id === k);
    return { text: opt?.name ?? k, color: opt?.color };
  };

  async function addCardTo(colKey: string): Promise<Database> {
    const before = new Set(db.rows.map((r) => r.id));
    const afterAdd = await addRow(db.id);
    const created = afterAdd.rows.find((r) => !before.has(r.id));
    if (created && colKey !== NULL_COL) return setCell(created.id, groupById, colKey);
    return afterAdd;
  }

  function onDragStart(e: DragStartEvent) {
    draggingRef.current = true;
    setActiveId(String(e.active.id));
  }

  /** Pindahkan kartu antar-kolom secara live (memberi placeholder di kolom tujuan). */
  function onDragOver(e: DragOverEvent) {
    const activeIdStr = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const from = colOf(activeIdStr);
    const to = colKeys.includes(overId) ? overId : colOf(overId);
    if (!from || !to || from === to) return;
    setCols((prev) => {
      const src = prev[from].filter((x) => x !== activeIdStr);
      const dstArr = prev[to];
      const overIdx = dstArr.indexOf(overId);
      const insertAt = overIdx >= 0 ? overIdx : dstArr.length;
      const dst = [...dstArr.slice(0, insertAt), activeIdStr, ...dstArr.slice(insertAt)];
      return { ...prev, [from]: src, [to]: dst };
    });
  }

  function endDrag() {
    setActiveId(null);
    setTimeout(() => (draggingRef.current = false), 0);
  }

  function onDragEnd(e: DragEndEvent) {
    const rowId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    // Reorder dalam kolom akhir (bila menjatuhkan di atas kartu lain).
    const finalCol = colOf(rowId);
    let next = cols;
    if (finalCol && overId && overId !== rowId && cols[finalCol]?.includes(overId)) {
      const arr = cols[finalCol];
      next = { ...cols, [finalCol]: arrayMove(arr, arr.indexOf(rowId), arr.indexOf(overId)) };
      setCols(next);
    }
    endDrag();
    if (!finalCol) return;

    // Persist: (1) group value bila kolom berubah, (2) urutan via afterId.
    const targetOption = keyToOption(finalCol);
    const curVal = cellOf(rowId, groupById);
    const groupChanged = (typeof curVal === "string" ? curVal : "") !== targetOption;
    const colArr = next[finalCol];
    const idx = colArr.indexOf(rowId);
    const afterId = idx > 0 ? colArr[idx - 1] : null;

    // Optimistic db: susun ulang rows global sesuai kolom + set cell group.
    const optimistic = (d: Database): Database => {
      const ordered = colKeys.flatMap((k) => next[k] ?? []);
      const rowMap = new Map(d.rows.map((r) => [r.id, r]));
      const rows = ordered.map((id) => rowMap.get(id)).filter((r): r is Database["rows"][number] => !!r);
      const withGroup = groupChanged ? withCell(d, rowId, groupById, targetOption || null) : d;
      return { ...withGroup, rows };
    };

    run(async () => {
      if (groupChanged) await setCell(rowId, groupById, targetOption);
      return moveRow(rowId, afterId);
    }, optimistic);
  }

  function openIfClick(rowId: string) {
    if (draggingRef.current) return;
    onOpenRow(rowId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={endDrag}
    >
      <div className="flex max-h-[70vh] items-start gap-3 overflow-auto p-3">
        {colKeys.map((k) => {
          const { text, color } = labelOf(k);
          const rowIds = cols[k] ?? [];
          return (
            <Column
              key={k}
              id={k}
              label={text}
              color={color}
              count={rowIds.length}
              onAdd={() => run(() => addCardTo(k))}
            >
              <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
                {rowIds.map((rowId) => (
                  <SortableCard key={rowId} id={rowId} onClick={() => openIfClick(rowId)}>
                    <RecordCard
                      db={db}
                      rowId={rowId}
                      cellOf={cellOf}
                      onDelete={() =>
                        run(
                          () => deleteRow(rowId),
                          (d) => withoutRow(d, rowId),
                        )
                      }
                    />
                  </SortableCard>
                ))}
              </SortableContext>
            </Column>
          );
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activeId ? (
          <div className="w-64 rotate-2 cursor-grabbing opacity-95 shadow-xl">
            <RecordCard db={db} rowId={activeId} cellOf={cellOf} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
