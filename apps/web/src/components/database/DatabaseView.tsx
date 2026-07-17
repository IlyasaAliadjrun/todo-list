import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database, DatabaseProperty, DatabaseViewConfig, DatabaseViewType } from "@notion/shared";
import { Columns3, MoreHorizontal, Plus, Table2, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  createView,
  deleteView,
  getDatabase,
  setActiveView,
  updateView,
} from "@/lib/database.api";
import { listMembers } from "@/lib/workspace.api";
import { FloatingMenu } from "@/components/ui/FloatingMenu";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { PeopleContext, buildCellLookup, type RunFn } from "./database-shared";
import { TableView } from "./TableView";
import { BoardView } from "./BoardView";
import { RecordPanel } from "./RecordPanel";

const VIEW_TYPES: { type: DatabaseViewType; label: string; Icon: typeof Table2 }[] = [
  { type: "TABLE", label: "Tabel", Icon: Table2 },
  { type: "BOARD", label: "Board", Icon: Columns3 },
];

/** Properti group-by Board: id tersimpan bila valid SELECT, else SELECT pertama. */
function resolveGroupBy(db: Database, storedId: string | null): DatabaseProperty | null {
  const stored = db.properties.find((p) => p.id === storedId && p.type === "SELECT");
  if (stored) return stored;
  return db.properties.find((p) => p.type === "SELECT") ?? null;
}

function iconOf(type: DatabaseViewType): typeof Table2 {
  return type === "BOARD" ? Columns3 : Table2;
}

/** Satu aksi database: thunk ke server + updater optimistic opsional. */
interface Job {
  thunk: () => Promise<Database>;
  optimistic?: (db: Database) => Database;
}

export function DatabaseView({ databaseId }: { databaseId: string }) {
  const qc = useQueryClient();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const {
    data: db,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["database", databaseId],
    queryFn: () => getDatabase(databaseId),
  });

  // Anggota workspace untuk properti PERSON (di-share lewat context).
  const { data: members = [] } = useQuery({
    queryKey: ["members", db?.workspaceId],
    queryFn: () => listMembers(db!.workspaceId),
    enabled: !!db?.workspaceId,
  });

  // Optimistic update: UI berubah seketika (tak menunggu XHR), respons server
  // menimpanya, dan bila gagal cache dikembalikan ke kondisi sebelumnya.
  const key = ["database", databaseId];
  const mutation = useMutation({
    mutationFn: (job: Job) => job.thunk(),
    onMutate: async (job: Job) => {
      if (!job.optimistic) return {};
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Database>(key);
      if (prev) qc.setQueryData(key, job.optimistic(prev));
      return { prev };
    },
    onError: (_err, _job, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (data) => qc.setQueryData(key, data),
  });
  const run: RunFn = (thunk, optimistic) => mutation.mutate({ thunk, optimistic });

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
  // View aktif: yang tersimpan, else view pertama.
  const view: DatabaseViewConfig | undefined =
    db.views.find((v) => v.id === db.activeViewId) ?? db.views[0];
  const groupByProperty = view ? resolveGroupBy(db, view.groupByPropertyId) : null;
  const activeType: DatabaseViewType = view?.type === "BOARD" ? "BOARD" : "TABLE";

  return (
    <PeopleContext.Provider value={members}>
      {/* w-full + min-w-0: block ini adalah flex item di .bn-block-content; tanpa min-w-0
          ia menolak menyusut di bawah lebar isi (board) dan melar keluar area. */}
      <div className="mb-2 w-full min-w-0 rounded-lg border bg-card" contentEditable={false}>
        <div className="flex flex-wrap items-center gap-2 border-b p-2">
          <span className="mr-1 truncate text-sm font-semibold">{db.title}</span>

          {/* Tab view tersimpan */}
          <div className="flex items-center gap-0.5">
            {db.views.map((v) => {
              const Icon = iconOf(v.type);
              const active = v.id === view?.id;
              return renamingId === v.id ? (
                <input
                  key={v.id}
                  autoFocus
                  defaultValue={v.name}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    setRenamingId(null);
                    if (name && name !== v.name) run(() => updateView(v.id, { name }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="h-7 w-28 rounded-md border border-input bg-background px-2 text-xs"
                />
              ) : (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    if (!active) run(() => setActiveView(databaseId, v.id));
                  }}
                  onDoubleClick={() => setRenamingId(v.id)}
                  title={`${v.name} — klik dua kali untuk ganti nama`}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                    active
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="max-w-[10rem] truncate">{v.name}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => run(() => createView(databaseId, {}))}
              aria-label="Tambah view"
              title="Tambah view"
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {view && (
            <>
              {/* Tipe view aktif */}
              <div className="flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5">
                {VIEW_TYPES.map(({ type, label, Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (type !== activeType) run(() => updateView(view.id, { type }));
                    }}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                      activeType === type
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

              {activeType === "BOARD" && selectProps.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  Kelompokkan
                  <SelectMenu
                    ariaLabel="Kelompokkan"
                    width={180}
                    value={groupByProperty?.id ?? ""}
                    onChange={(v) => run(() => updateView(view.id, { groupByPropertyId: v }))}
                    options={selectProps.map((p) => ({ value: p.id, label: p.name }))}
                    triggerClassName="flex h-7 min-w-[7rem] items-center justify-between gap-1 rounded-md border border-input bg-background px-2 text-left text-xs text-foreground hover:bg-secondary/60"
                  />
                </div>
              )}

              <FloatingMenu
                ariaLabel="Menu view"
                width={180}
                triggerClassName="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                trigger={<MoreHorizontal className="h-3.5 w-3.5" />}
              >
                {(close) => (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(view.id);
                        close();
                      }}
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-secondary"
                    >
                      Ganti nama view
                    </button>
                    <button
                      type="button"
                      disabled={db.views.length <= 1}
                      onClick={() => {
                        run(() => deleteView(view.id));
                        close();
                      }}
                      className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm text-destructive hover:bg-secondary disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Hapus view
                    </button>
                  </div>
                )}
              </FloatingMenu>
            </>
          )}
        </div>

        {activeType === "TABLE" && (
          <TableView db={db} run={run} onOpenRow={(id) => setOpenRowId(id)} />
        )}
        {activeType === "BOARD" && (
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
    </PeopleContext.Provider>
  );
}
