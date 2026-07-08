import { describe, expect, it } from "vitest";
import { bucketRowsByDate, dateKeyOf, groupRowsByOption, type CellLookup } from "@notion/shared";

const rows = [{ id: "r1" }, { id: "r2" }, { id: "r3" }, { id: "r4" }];

function lookup(table: Record<string, Record<string, unknown>>): CellLookup {
  return (rowId, propId) => table[rowId]?.[propId] ?? null;
}

describe("groupRowsByOption (Board)", () => {
  const cellOf = lookup({
    r1: { status: "todo" },
    r2: { status: "done" },
    r3: { status: "todo" },
    r4: {}, // tanpa nilai
  });

  it("mengelompokkan baris per opsi, mempertahankan urutan input", () => {
    const cols = groupRowsByOption(rows, cellOf, "status", ["todo", "done"]);
    expect(cols.map((c) => c.optionId)).toEqual(["todo", "done", null]);
    expect(cols[0].rowIds).toEqual(["r1", "r3"]);
    expect(cols[1].rowIds).toEqual(["r2"]);
  });

  it("menaruh nilai kosong/tak dikenal ke kolom null", () => {
    const cellOf2 = lookup({ r1: { status: "ghost" }, r4: {} });
    const cols = groupRowsByOption([{ id: "r1" }, { id: "r4" }], cellOf2, "status", ["todo"]);
    const nullCol = cols.find((c) => c.optionId === null)!;
    expect(nullCol.rowIds).toEqual(["r1", "r4"]);
  });

  it("selalu menyertakan kolom null meski semua baris punya nilai", () => {
    const cols = groupRowsByOption([{ id: "r1" }], cellOf, "status", ["todo"]);
    expect(cols.some((c) => c.optionId === null)).toBe(true);
  });
});

describe("dateKeyOf & bucketRowsByDate (Calendar)", () => {
  it("dateKeyOf menormalkan ISO/tanggal ke YYYY-MM-DD, menolak invalid", () => {
    expect(dateKeyOf("2026-07-08")).toBe("2026-07-08");
    expect(dateKeyOf("2026-07-08T10:30:00Z")).toBe("2026-07-08");
    expect(dateKeyOf("")).toBeNull();
    expect(dateKeyOf(null)).toBeNull();
    expect(dateKeyOf("bukan-tanggal")).toBeNull();
    expect(dateKeyOf(12345)).toBeNull();
  });

  it("mengelompokkan baris per hari, melewati yang tak bertanggal", () => {
    const cellOf = lookup({
      r1: { due: "2026-07-08" },
      r2: { due: "2026-07-08T23:00:00Z" },
      r3: { due: "2026-07-09" },
      r4: {},
    });
    const map = bucketRowsByDate(rows, cellOf, "due");
    expect(map.get("2026-07-08")).toEqual(["r1", "r2"]);
    expect(map.get("2026-07-09")).toEqual(["r3"]);
    expect(map.has("undefined")).toBe(false);
    expect([...map.keys()].length).toBe(2);
  });
});
