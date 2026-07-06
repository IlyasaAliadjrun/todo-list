import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database, DatabaseProperty, PropertyType } from "@notion/shared";
import { ArrowLeft, ArrowRight, ChevronDown, Plus, Settings2, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  addProperty,
  addRow,
  deleteProperty,
  deleteRow,
  getDatabase,
  moveProperty,
  setCell,
  updateProperty,
} from "@/lib/database.api";
import { cn } from "@/lib/utils";
import { CellEditor } from "./CellEditor";

const TYPE_LABELS: Record<PropertyType, string> = {
  TEXT: "Teks",
  NUMBER: "Angka",
  SELECT: "Select",
  MULTI_SELECT: "Multi-select",
  CHECKBOX: "Checkbox",
  DATE: "Tanggal",
  URL: "URL",
};
const TYPES = Object.keys(TYPE_LABELS) as PropertyType[];

function newOptionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `opt-${Math.floor(performance.now())}`;
}

interface HeaderProps {
  property: DatabaseProperty;
  index: number;
  total: number;
  sortDir: "asc" | "desc" | null;
  onSort: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  run: (thunk: () => Promise<Database>) => void;
}

function PropertyHeader({
  property,
  index,
  total,
  sortDir,
  onSort,
  onMoveLeft,
  onMoveRight,
  run,
}: HeaderProps) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(property.name);
  const [optionDraft, setOptionDraft] = useState("");
  const isSelectType = property.type === "SELECT" || property.type === "MULTI_SELECT";

  return (
    <th className="border-b border-r p-0 text-left font-medium last:border-r-0">
      <div className="flex items-center gap-1 px-2 py-1.5">
        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditingName(false);
              if (name.trim() && name.trim() !== property.name)
                run(() => updateProperty(property.id, { name: name.trim() }));
              else setName(property.name);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setName(property.name);
                setEditingName(false);
              }
            }}
            className="h-6 min-w-0 flex-1 rounded border border-input bg-background px-1 text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={onSort}
            onDoubleClick={() => {
              setName(property.name);
              setEditingName(true);
            }}
            className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm"
            title="Klik untuk urutkan · klik dua kali untuk ganti nama"
          >
            <span className="truncate">{property.name}</span>
            {sortDir && (
              <span className="text-xs text-muted-foreground">{sortDir === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        )}

        <details className="relative shrink-0">
          <summary className="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Settings2 className="h-3.5 w-3.5" />
          </summary>
          <div className="absolute right-0 z-30 mt-1 w-56 space-y-2 rounded-md border bg-background p-2 text-sm shadow-md">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Tipe</span>
              <select
                value={property.type}
                onChange={(e) =>
                  run(() => updateProperty(property.id, { type: e.target.value as PropertyType }))
                }
                className="h-8 w-full rounded-md border border-input bg-background px-2"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            {isSelectType && (
              <div>
                <span className="mb-1 block text-xs text-muted-foreground">Opsi</span>
                <div className="space-y-1">
                  {property.options.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded bg-secondary px-1.5 py-0.5"
                    >
                      <span className="truncate text-xs">{o.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          run(() =>
                            updateProperty(property.id, {
                              options: property.options.filter((x) => x.id !== o.id),
                            }),
                          )
                        }
                        aria-label="Hapus opsi"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <form
                  className="mt-1 flex gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const label = optionDraft.trim();
                    if (!label) return;
                    setOptionDraft("");
                    run(() =>
                      updateProperty(property.id, {
                        options: [...property.options, { id: newOptionId(), name: label }],
                      }),
                    );
                  }}
                >
                  <input
                    value={optionDraft}
                    onChange={(e) => setOptionDraft(e.target.value)}
                    placeholder="Opsi baru"
                    className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="rounded bg-secondary px-2 text-xs hover:bg-secondary/70"
                  >
                    +
                  </button>
                </form>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={onMoveLeft}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                  aria-label="Pindah kiri"
                  title="Pindah kiri"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === total - 1}
                  onClick={onMoveRight}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                  aria-label="Pindah kanan"
                  title="Pindah kanan"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                disabled={total <= 1}
                onClick={() => run(() => deleteProperty(property.id))}
                className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-destructive hover:bg-secondary disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus kolom
              </button>
            </div>
          </div>
        </details>
      </div>
    </th>
  );
}

export function DatabaseView({ databaseId }: { databaseId: string }) {
  const qc = useQueryClient();
  const {
    data: db,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["database", databaseId],
    queryFn: () => getDatabase(databaseId),
  });
  const [sort, setSort] = useState<{ propertyId: string; dir: "asc" | "desc" } | null>(null);
  const [filter, setFilter] = useState("");

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

  const cellMap = new Map<string, unknown>();
  for (const c of db.cells) cellMap.set(`${c.rowId}:${c.propertyId}`, c.value);
  const cellOf = (rowId: string, propId: string): unknown =>
    cellMap.get(`${rowId}:${propId}`) ?? null;

  const displayText = (prop: DatabaseProperty, value: unknown): string => {
    if (prop.type === "SELECT") return prop.options.find((o) => o.id === value)?.name ?? "";
    if (prop.type === "MULTI_SELECT")
      return (Array.isArray(value) ? value : [])
        .map((id) => prop.options.find((o) => o.id === id)?.name ?? "")
        .join(" ");
    return value == null ? "" : String(value);
  };

  const q = filter.trim().toLowerCase();
  let rows = q
    ? db.rows.filter((r) =>
        db.properties.some((p) => displayText(p, cellOf(r.id, p.id)).toLowerCase().includes(q)),
      )
    : db.rows;

  if (sort) {
    const prop = db.properties.find((p) => p.id === sort.propertyId);
    rows = [...rows].sort((a, b) => {
      const va = cellOf(a.id, sort.propertyId);
      const vb = cellOf(b.id, sort.propertyId);
      let cmp: number;
      if (prop?.type === "NUMBER") cmp = Number(va ?? 0) - Number(vb ?? 0);
      else cmp = displayText(prop!, va).localeCompare(displayText(prop!, vb));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }

  const toggleSort = (propertyId: string): void =>
    setSort((prev) =>
      prev?.propertyId === propertyId
        ? prev.dir === "asc"
          ? { propertyId, dir: "desc" }
          : null
        : { propertyId, dir: "asc" },
    );

  return (
    <div className="my-2 rounded-lg border bg-card" contentEditable={false}>
      <div className="flex items-center justify-between gap-2 border-b p-2">
        <span className="truncate text-sm font-semibold">{db.title}</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Cari…"
          className="h-7 w-32 rounded-md border border-input bg-background px-2 text-sm sm:w-48"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-8 border-b border-r" />
              {db.properties.map((p, i) => (
                <PropertyHeader
                  key={p.id}
                  property={p}
                  index={i}
                  total={db.properties.length}
                  sortDir={sort?.propertyId === p.id ? sort.dir : null}
                  onSort={() => toggleSort(p.id)}
                  onMoveLeft={() => run(() => moveProperty(p.id, db.properties[i - 2]?.id ?? null))}
                  onMoveRight={() => {
                    if (i < db.properties.length - 1)
                      run(() => moveProperty(p.id, db.properties[i + 1].id));
                  }}
                  run={run}
                />
              ))}
              <th className="w-10 border-b p-0">
                <button
                  type="button"
                  onClick={() => run(() => addProperty(databaseId, {}))}
                  className="flex h-full w-full items-center justify-center py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Tambah kolom"
                  title="Tambah kolom"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="group">
                <td className="border-b border-r text-center align-middle">
                  <button
                    type="button"
                    onClick={() => run(() => deleteRow(row.id))}
                    className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                    aria-label="Hapus baris"
                  >
                    <Trash2 className="mx-auto h-3.5 w-3.5" />
                  </button>
                </td>
                {db.properties.map((p) => (
                  <td
                    key={p.id}
                    className="border-b border-r px-2 py-1 align-middle last:border-r-0"
                  >
                    <CellEditor
                      property={p}
                      value={cellOf(row.id, p.id)}
                      onCommit={(value) => run(() => setCell(row.id, p.id, value))}
                    />
                  </td>
                ))}
                <td className="border-b" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => run(() => addRow(databaseId))}
        className={cn(
          "flex w-full items-center gap-1 px-3 py-1.5 text-left text-sm text-muted-foreground",
          "hover:bg-secondary hover:text-foreground",
        )}
      >
        <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" /> Baris baru
      </button>
    </div>
  );
}
