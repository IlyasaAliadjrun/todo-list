import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database, DatabaseProperty, DatabaseViewType } from "@notion/shared";
import { Columns3, Table2 } from "lucide-react";
import { useState } from "react";
import { getDatabase, updateDatabaseView } from "@/lib/database.api";
import { buildCellLookup } from "./database-shared";
import { TableView } from "./TableView";
import { BoardView } from "./BoardView";
import { RecordPanel } from "./RecordPanel";

const VIEWS: { type: DatabaseViewType; label: string; Icon: typeof Table2 }[] = [
  { type: "TABLE", label: "Tabel", Icon: Table2 },
  { type: "BOARD", label: "Board", Icon: Columns3 },
];

/** Properti group-by Board: id tersimpan bila valid SELECT, else SELECT pertama. */
function resolveGroupBy(db: Database, storedId: string | null): DatabaseProperty | null {
  const stored = db.properties.find((p) => p.id === storedId && p.type === "SELECT");
  if (stored) return stored;
  return db.properties.find((p) => p.type === "SELECT") ?? null;
}

export function DatabaseView({ databaseId }: { databaseId: string }) {
  const qc = useQueryClient();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const {
    data: db,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["database", databaseId],
    queryFn: () => getDatabase(databaseId),
  });

  const mutation = useMutation({
    mutationFn: (thunk: () => Promise<Database>) => thunk(),
    onSuccess: (data) => qc.setQueryData(["database", databaseId], data),
  });
  const run = (thunk: () => Promise<Database>): void => mutation.mutate(thunk);

  if (isLoading)
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">Memuat database…</div>
    );
  if (isError || !db)
    return (
      <div className="rounded-md border p-3 text-sm text-destructive">Gagal memuat database.</div>
    );

  const cellOf = buildCellLookup(db);
  const selectProps = db.properties.filter((p) => p.type === "SELECT");
  const groupByProperty = resolveGroupBy(db, db.groupByPropertyId);
  // Hanya TABLE & BOARD didukung; nilai lain (mis. lama) → tampilkan sebagai Board bila diminta, else Tabel.
  const activeView: DatabaseViewType = db.viewType === "BOARD" ? "BOARD" : "TABLE";

  return (
    <div className="mb-2 rounded-lg border bg-card" contentEditable={false}>
      <div className="flex flex-wrap items-center gap-2 border-b p-2">
        <span className="mr-1 truncate text-sm font-semibold">{db.title}</span>

        <div className="flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5">
          {VIEWS.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                if (type !== activeView)
                  run(() => updateDatabaseView(databaseId, { viewType: type }));
              }}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                activeView === type
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {activeView === "BOARD" && selectProps.length > 0 && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Kelompokkan
            <select
              value={groupByProperty?.id ?? ""}
              onChange={(e) =>
                run(() => updateDatabaseView(databaseId, { groupByPropertyId: e.target.value }))
              }
              className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            >
              {selectProps.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {activeView === "TABLE" && (
        <TableView db={db} run={run} onOpenRow={(id) => setOpenRowId(id)} />
      )}
      {activeView === "BOARD" && (
        <BoardView
          db={db}
          run={run}
          groupByProperty={groupByProperty}
          cellOf={cellOf}
          onOpenRow={(id) => setOpenRowId(id)}
        />
      )}

      {openRowId && (
        <RecordPanel db={db} rowId={openRowId} run={run} onClose={() => setOpenRowId(null)} />
      )}
    </div>
  );
}
