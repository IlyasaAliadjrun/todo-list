import type { Database } from "@notion/shared";
import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { addProperty, deleteRow, setCell } from "@/lib/database.api";
import { CellEditor } from "./CellEditor";
import { buildCellLookup, titleProperty } from "./database-shared";

/**
 * Panel detail record (peek ala Notion): geser dari kanan, edit semua properti
 * satu baris. Dirender via portal ke <body> agar menutupi layar penuh & lepas
 * dari overflow/contentEditable. Tutup via backdrop, tombol X, atau Escape.
 */
export function RecordPanel({
  db,
  rowId,
  run,
  onClose,
}: {
  db: Database;
  rowId: string;
  run: (thunk: () => Promise<Database>) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const exists = db.rows.some((r) => r.id === rowId);
  useEffect(() => {
    if (!exists) onClose();
  }, [exists, onClose]);
  if (!exists) return null;

  const cellOf = buildCellLookup(db);
  const title = titleProperty(db);
  const others = db.properties.filter((p) => p.id !== title?.id);
  const titleVal = title ? cellOf(rowId, title.id) : null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/30"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-l bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {db.title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {title && (
            <TitleInput
              key={rowId}
              value={typeof titleVal === "string" ? titleVal : ""}
              onCommit={(v) => run(() => setCell(rowId, title.id, v))}
            />
          )}

          <div className="space-y-1">
            {others.map((p) => (
              <div key={p.id} className="flex items-start gap-2 rounded px-1 py-1 hover:bg-muted/40">
                <span className="mt-1 w-28 shrink-0 truncate text-xs text-muted-foreground">
                  {p.name}
                </span>
                <div className="min-w-0 flex-1">
                  <CellEditor
                    property={p}
                    value={cellOf(rowId, p.id)}
                    onCommit={(value) => run(() => setCell(rowId, p.id, value))}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => run(() => addProperty(db.id, {}))}
            className="rounded px-1 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            + Tambah properti
          </button>

          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => {
                run(() => deleteRow(rowId));
                onClose();
              }}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-destructive hover:bg-secondary"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus record
            </button>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function TitleInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      placeholder="Tanpa judul"
      className="w-full bg-transparent text-xl font-bold outline-none placeholder:text-muted-foreground"
    />
  );
}
