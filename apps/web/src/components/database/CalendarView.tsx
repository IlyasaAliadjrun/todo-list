import type { Database, DatabaseProperty } from "@notion/shared";
import { bucketRowsByDate } from "@notion/shared";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { addRow, setCell } from "@/lib/database.api";
import { displayText, optionBadgeClass, titleProperty } from "./database-shared";

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function dayKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CalendarView({
  db,
  run,
  dateProperty,
  cellOf,
}: {
  db: Database;
  run: (thunk: () => Promise<Database>) => void;
  dateProperty: DatabaseProperty | null;
  cellOf: (rowId: string, propId: string) => unknown;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  if (!dateProperty) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Pilih properti <span className="font-medium text-foreground">Tanggal</span> untuk
        memosisikan kartu (menu “Tanggal” di atas). Belum punya? Tambah kolom bertipe Tanggal di
        Table view.
      </div>
    );
  }

  const buckets = bucketRowsByDate(db.rows, cellOf, dateProperty.id);
  const title = titleProperty(db);
  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  // Sel kosong sebelum tanggal 1, lalu 1..daysInMonth. Dibulatkan ke kelipatan 7.
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  async function addOnDay(key: string): Promise<Database> {
    const before = new Set(db.rows.map((r) => r.id));
    const afterAdd = await addRow(db.id);
    const created = afterAdd.rows.find((r) => !before.has(r.id));
    if (created) return setCell(created.id, dateProperty!.id, key);
    return afterAdd;
  }

  const shift = (delta: number) =>
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">
          {MONTHS[cursor.month]} {cursor.year}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="rounded p-1 text-muted-foreground hover:bg-secondary"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
          >
            Hari ini
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="rounded p-1 text-muted-foreground hover:bg-secondary"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-l border-t text-xs">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="border-b border-r bg-muted/40 px-1 py-1 text-center font-medium text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null)
            return <div key={i} className="min-h-20 border-b border-r bg-muted/20" />;
          const key = dayKey(cursor.year, cursor.month, day);
          const rowIds = buckets.get(key) ?? [];
          return (
            <div key={i} className="group/day min-h-20 border-b border-r p-1 align-top">
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={
                    key === todayKey
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                      : "px-1 text-xs text-muted-foreground"
                  }
                >
                  {day}
                </span>
                <button
                  type="button"
                  onClick={() => run(() => addOnDay(key))}
                  className="text-muted-foreground opacity-0 hover:text-foreground group-hover/day:opacity-100"
                  aria-label={`Tambah baris ${key}`}
                  title="Tambah di tanggal ini"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                {rowIds.map((rowId) => {
                  const text = title ? displayText(title, cellOf(rowId, title.id)) : "";
                  return (
                    <div
                      key={rowId}
                      className={`truncate rounded px-1 py-0.5 text-xs ${optionBadgeClass()}`}
                      title={text}
                    >
                      {text || "Tanpa judul"}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
