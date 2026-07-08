/**
 * Helper murni untuk view database (Board/Calendar) — tanpa dependensi UI, agar
 * mudah diuji unit. Lihat ADR 0010.
 */

export type CellLookup = (rowId: string, propertyId: string) => unknown;

export interface BoardColumn {
  /** id opsi SELECT; `null` = kolom "tanpa nilai". */
  optionId: string | null;
  rowIds: string[];
}

/**
 * Kelompokkan baris ke kolom Board berdasar properti SELECT. Kolom dibuat untuk
 * setiap `optionIds` (urut) plus satu kolom `null` (baris tanpa nilai valid).
 * Urutan baris dalam kolom mengikuti urutan `rows`.
 */
export function groupRowsByOption(
  rows: { id: string }[],
  cellOf: CellLookup,
  groupByPropertyId: string,
  optionIds: string[],
): BoardColumn[] {
  const columns: BoardColumn[] = [
    ...optionIds.map((optionId) => ({ optionId, rowIds: [] as string[] })),
    { optionId: null, rowIds: [] as string[] },
  ];
  const byId = new Map<string | null, BoardColumn>(columns.map((c) => [c.optionId, c]));
  for (const row of rows) {
    const raw = cellOf(row.id, groupByPropertyId);
    const key = typeof raw === "string" && byId.has(raw) ? raw : null;
    byId.get(key)!.rowIds.push(row.id);
  }
  return columns;
}

/** Normalisasi nilai sel DATE ke kunci hari `YYYY-MM-DD`, atau `null` bila kosong/invalid. */
export function dateKeyOf(raw: unknown): string | null {
  if (typeof raw !== "string" || raw === "") return null;
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** Peta `YYYY-MM-DD` → daftar rowId dari properti DATE (untuk Calendar). */
export function bucketRowsByDate(
  rows: { id: string }[],
  cellOf: CellLookup,
  datePropertyId: string,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const day = dateKeyOf(cellOf(row.id, datePropertyId));
    if (!day) continue;
    const list = map.get(day);
    if (list) list.push(row.id);
    else map.set(day, [row.id]);
  }
  return map;
}
