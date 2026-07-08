import type { Database, DatabaseProperty, PropertyType } from "@notion/shared";

export const TYPE_LABELS: Record<PropertyType, string> = {
  TEXT: "Teks",
  NUMBER: "Angka",
  SELECT: "Select",
  MULTI_SELECT: "Multi-select",
  CHECKBOX: "Checkbox",
  DATE: "Tanggal",
  URL: "URL",
};

/** Lookup nilai sel O(1). */
export function buildCellLookup(db: Database): (rowId: string, propId: string) => unknown {
  const map = new Map<string, unknown>();
  for (const c of db.cells) map.set(`${c.rowId}:${c.propertyId}`, c.value);
  return (rowId, propId) => map.get(`${rowId}:${propId}`) ?? null;
}

/** Teks tampilan sebuah nilai sel sesuai tipe properti. */
export function displayText(prop: DatabaseProperty, value: unknown): string {
  if (prop.type === "SELECT") return prop.options.find((o) => o.id === value)?.name ?? "";
  if (prop.type === "MULTI_SELECT")
    return (Array.isArray(value) ? value : [])
      .map((id) => prop.options.find((o) => o.id === id)?.name ?? "")
      .join(" ");
  if (prop.type === "CHECKBOX") return value === true ? "✓" : "";
  return value == null ? "" : String(value);
}

/** Properti "judul" kartu: properti TEXT pertama, atau properti pertama. */
export function titleProperty(db: Database): DatabaseProperty | undefined {
  return db.properties.find((p) => p.type === "TEXT") ?? db.properties[0];
}

const COLOR_CLASSES: Record<string, string> = {
  gray: "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100",
  brown: "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100",
  orange: "bg-orange-200 text-orange-900 dark:bg-orange-900/60 dark:text-orange-100",
  yellow: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-100",
  green: "bg-green-200 text-green-900 dark:bg-green-900/60 dark:text-green-100",
  blue: "bg-blue-200 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100",
  purple: "bg-purple-200 text-purple-900 dark:bg-purple-900/60 dark:text-purple-100",
  pink: "bg-pink-200 text-pink-900 dark:bg-pink-900/60 dark:text-pink-100",
  red: "bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-100",
};

/** Kelas badge untuk warna opsi (fallback: secondary netral). */
export function optionBadgeClass(color?: string): string {
  return (color && COLOR_CLASSES[color]) || "bg-secondary text-secondary-foreground";
}

/** Daftar warna opsi yang bisa dipilih (urutan untuk auto-assign & siklus). */
export const OPTION_COLORS = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;

const SWATCH_CLASSES: Record<string, string> = {
  gray: "bg-neutral-400",
  brown: "bg-amber-700",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  red: "bg-red-500",
};

/** Kelas latar untuk titik warna (swatch) di editor opsi. */
export function swatchClass(color?: string): string {
  return (color && SWATCH_CLASSES[color]) || "bg-neutral-400";
}

/** Badge berwarna untuk nilai SELECT/MULTI_SELECT sebuah baris. */
export function OptionBadges({
  property,
  value,
}: {
  property: DatabaseProperty;
  value: unknown;
}) {
  const ids =
    property.type === "SELECT"
      ? typeof value === "string" && value
        ? [value]
        : []
      : Array.isArray(value)
        ? (value as string[])
        : [];
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const opt = property.options.find((o) => o.id === id);
        if (!opt) return null;
        return (
          <span
            key={id}
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${optionBadgeClass(opt.color)}`}
          >
            {opt.name}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Kartu satu baris database (dipakai Board/Gallery/Calendar): judul + badge
 * SELECT/MULTI_SELECT + properti scalar non-kosong lain. `onClick` opsional (mis. hapus).
 */
export function RecordCard({
  db,
  rowId,
  cellOf,
  cover,
  onDelete,
}: {
  db: Database;
  rowId: string;
  cellOf: (rowId: string, propId: string) => unknown;
  cover?: string | null;
  onDelete?: () => void;
}) {
  const title = titleProperty(db);
  const titleText = title ? displayText(title, cellOf(rowId, title.id)) : "";
  const selectProps = db.properties.filter(
    (p) => p.type === "SELECT" || p.type === "MULTI_SELECT",
  );
  const scalarProps = db.properties.filter(
    (p) => p.id !== title?.id && (p.type === "NUMBER" || p.type === "DATE" || p.type === "URL"),
  );

  return (
    <div className="group/card relative rounded-md border bg-background p-2 text-sm shadow-sm">
      {cover ? (
        <img
          src={cover}
          alt=""
          className="mb-2 h-24 w-full rounded object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="flex items-start justify-between gap-1">
        <span className="min-w-0 flex-1 truncate font-medium">
          {titleText || <span className="text-muted-foreground">Tanpa judul</span>}
        </span>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="shrink-0 text-xs text-muted-foreground opacity-0 hover:text-destructive group-hover/card:opacity-100"
            aria-label="Hapus baris"
            title="Hapus baris"
          >
            ✕
          </button>
        )}
      </div>
      {selectProps.map((p) => (
        <div key={p.id} className="mt-1">
          <OptionBadges property={p} value={cellOf(rowId, p.id)} />
        </div>
      ))}
      {scalarProps.map((p) => {
        const text = displayText(p, cellOf(rowId, p.id));
        if (!text) return null;
        return (
          <p key={p.id} className="mt-1 truncate text-xs text-muted-foreground">
            <span className="opacity-70">{p.name}:</span> {text}
          </p>
        );
      })}
    </div>
  );
}
