import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Database, DatabaseProperty } from "@notion/shared";
import { groupRowsByOption } from "@notion/shared";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { addRow, deleteRow, setCell } from "@/lib/database.api";
import { RecordCard, optionBadgeClass } from "./database-shared";

const NULL_COL = "__none__";

function DraggableCard({
  id,
  onClick,
  children,
}: {
  id: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      // Overlay yang bergerak saat drag (lihat DragOverlay); elemen asli diredupkan.
      className={`cursor-grab touch-none active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {children}
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
  label: React.ReactNode;
  color?: string;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        {typeof label === "string" ? (
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${optionBadgeClass(color)}`}>
            {label}
          </span>
        ) : (
          label
        )}
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {/* Seluruh area kolom = zona drop (flex-1 + min-h), bukan hanya di atas kartu. */}
      <div
        ref={setNodeRef}
        className={`flex min-h-28 flex-1 flex-col gap-2 rounded-md p-1.5 transition-colors ${
          isOver ? "bg-secondary ring-2 ring-primary/30" : "bg-muted/40"
        }`}
      >
        {children}
        <button
          type="button"
          onClick={onAdd}
          className="mt-auto flex items-center gap-1 rounded px-1.5 py-1 text-left text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
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
  run: (thunk: () => Promise<Database>) => void;
  groupByProperty: DatabaseProperty | null;
  cellOf: (rowId: string, propId: string) => unknown;
  onOpenRow: (rowId: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  // Bedakan klik (buka panel) dari drag: set saat drag mulai, klik pasca-drag diabaikan.
  const draggingRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!groupByProperty) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Pilih properti <span className="font-medium text-foreground">Select</span> untuk
        dikelompokkan (menu “Kelompokkan” di atas). Belum punya? Tambah kolom bertipe Select di
        Table view.
      </div>
    );
  }

  const groupById = groupByProperty.id;
  const optionIds = groupByProperty.options.map((o) => o.id);
  const columns = groupRowsByOption(db.rows, cellOf, groupById, optionIds);

  async function addCardTo(optionId: string | null): Promise<Database> {
    const before = new Set(db.rows.map((r) => r.id));
    const afterAdd = await addRow(db.id);
    const created = afterAdd.rows.find((r) => !before.has(r.id));
    if (created && optionId) return setCell(created.id, groupById, optionId);
    return afterAdd;
  }

  function onDragStart(e: DragStartEvent) {
    draggingRef.current = true;
    setActiveId(String(e.active.id));
  }

  function endDrag() {
    setActiveId(null);
    setTimeout(() => (draggingRef.current = false), 0); // reset setelah event klik pasca-drop
  }

  function onDragEnd(e: DragEndEvent) {
    endDrag();
    const rowId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const targetOption = overId === NULL_COL ? "" : overId;
    const current = cellOf(rowId, groupById);
    const currentStr = typeof current === "string" ? current : "";
    if (currentStr === targetOption) return;
    run(() => setCell(rowId, groupById, targetOption));
  }

  function openIfClick(rowId: string) {
    if (draggingRef.current) return; // ini akhir dari drag, bukan klik murni
    onOpenRow(rowId);
  }

  const labelOf = (optionId: string | null): { text: string; color?: string } => {
    if (optionId === null) return { text: `Tanpa ${groupByProperty.name}` };
    const opt = groupByProperty.options.find((o) => o.id === optionId);
    return { text: opt?.name ?? optionId, color: opt?.color };
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={endDrag}
    >
      {/* Tinggi dibatasi → scrollbar horizontal tetap terlihat; min-h agar kolom tinggi. */}
      <div className="flex max-h-[70vh] min-h-[18rem] items-stretch gap-3 overflow-auto p-3">
        {columns.map((col) => {
          const { text, color } = labelOf(col.optionId);
          const colId = col.optionId ?? NULL_COL;
          return (
            <Column
              key={colId}
              id={colId}
              label={text}
              color={color}
              count={col.rowIds.length}
              onAdd={() => run(() => addCardTo(col.optionId))}
            >
              {col.rowIds.map((rowId) => (
                <DraggableCard key={rowId} id={rowId} onClick={() => openIfClick(rowId)}>
                  <RecordCard
                    db={db}
                    rowId={rowId}
                    cellOf={cellOf}
                    onDelete={() => run(() => deleteRow(rowId))}
                  />
                </DraggableCard>
              ))}
            </Column>
          );
        })}
      </div>

      {/* Kartu melayang saat drag → transisi mulus, mengikuti kursor. */}
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
