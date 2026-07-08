import type { Database, DatabaseProperty } from "@notion/shared";
import { Plus } from "lucide-react";
import { addRow, deleteRow } from "@/lib/database.api";
import { RecordCard } from "./database-shared";

export function GalleryView({
  db,
  run,
  coverProperty,
  cellOf,
}: {
  db: Database;
  run: (thunk: () => Promise<Database>) => void;
  coverProperty: DatabaseProperty | null;
  cellOf: (rowId: string, propId: string) => unknown;
}) {
  const coverOf = (rowId: string): string | null => {
    if (!coverProperty) return null;
    const v = cellOf(rowId, coverProperty.id);
    return typeof v === "string" && v ? v : null;
  };

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {db.rows.map((row) => (
          <RecordCard
            key={row.id}
            db={db}
            rowId={row.id}
            cellOf={cellOf}
            cover={coverOf(row.id)}
            onDelete={() => run(() => deleteRow(row.id))}
          />
        ))}
        <button
          type="button"
          onClick={() => run(() => addRow(db.id))}
          className="flex min-h-24 items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Baru
        </button>
      </div>
    </div>
  );
}
