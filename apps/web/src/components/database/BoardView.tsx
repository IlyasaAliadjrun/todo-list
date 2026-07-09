import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Database, DatabaseProperty } from "@notion/shared";
import { groupRowsByOption } from "@notion/shared";
import { Plus } from "lucide-react";
import { useRef } from "react";
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      style={
        transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined
      }
      className={`cursor-pointer ${isDragging ? "opacity-50" : ""}`}
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
      <div
        ref={setNodeRef}
        className={`flex min-h-16 flex-1 flex-col gap-2 rounded-md p-1.5 transition-colors ${
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
  run: (thunk: () => Promise<Database>) => void;
  groupByProperty: DatabaseProperty | null;
  cellOf: (rowId: string, propId: string) => unknown;
  onOpenRow: (rowId: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  // Bedakan klik (buka panel) dari drag: set saat drag mulai, klik pasca-drag diabaikan.
  const draggingRef = useRef(false);

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

  function onDragEnd(e: DragEndEvent) {
    setTimeout(() => (draggingRef.current = false), 0); // reset setelah event klik pasca-drop
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
      onDragStart={() => (draggingRef.current = true)}
      onDragEnd={onDragEnd}
    >
      {/* Tinggi dibatasi → scrollbar horizontal tetap terlihat (tak di dasar board yang panjang). */}
      <div className="flex max-h-[70vh] gap-3 overflow-auto p-3">
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
    </DndContext>
  );
}
