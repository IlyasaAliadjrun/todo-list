import { normalizeCellValue, type SelectOption } from "@notion/shared";
import { describe, expect, it } from "vitest";

const opts: SelectOption[] = [
  { id: "o1", name: "Satu" },
  { id: "o2", name: "Dua" },
];

describe("normalizeCellValue", () => {
  it("TEXT: kosong → null, selain itu string", () => {
    expect(normalizeCellValue("TEXT", [], "")).toBeNull();
    expect(normalizeCellValue("TEXT", [], "halo")).toBe("halo");
    expect(normalizeCellValue("TEXT", [], 42)).toBe("42");
  });

  it("NUMBER: parse angka, tolak non-angka", () => {
    expect(normalizeCellValue("NUMBER", [], "12.5")).toBe(12.5);
    expect(normalizeCellValue("NUMBER", [], "")).toBeNull();
    expect(() => normalizeCellValue("NUMBER", [], "abc")).toThrow();
  });

  it("CHECKBOX: boolean", () => {
    expect(normalizeCellValue("CHECKBOX", [], true)).toBe(true);
    expect(normalizeCellValue("CHECKBOX", [], "true")).toBe(true);
    expect(normalizeCellValue("CHECKBOX", [], false)).toBe(false);
    expect(normalizeCellValue("CHECKBOX", [], undefined)).toBe(false);
  });

  it("URL: wajib http(s)", () => {
    expect(normalizeCellValue("URL", [], "https://x.com")).toBe("https://x.com");
    expect(() => normalizeCellValue("URL", [], "ftp://x")).toThrow();
    expect(normalizeCellValue("URL", [], "")).toBeNull();
  });

  it("DATE: ISO valid, tolak sampah", () => {
    expect(normalizeCellValue("DATE", [], "2026-07-06")).toBe("2026-07-06");
    expect(() => normalizeCellValue("DATE", [], "bukan-tanggal")).toThrow();
  });

  it("SELECT: harus salah satu opsi", () => {
    expect(normalizeCellValue("SELECT", opts, "o1")).toBe("o1");
    expect(normalizeCellValue("SELECT", opts, "")).toBeNull();
    expect(() => normalizeCellValue("SELECT", opts, "ghost")).toThrow();
  });

  it("MULTI_SELECT: subset opsi, default array kosong", () => {
    expect(normalizeCellValue("MULTI_SELECT", opts, ["o1", "o2"])).toEqual(["o1", "o2"]);
    expect(normalizeCellValue("MULTI_SELECT", opts, null)).toEqual([]);
    expect(() => normalizeCellValue("MULTI_SELECT", opts, ["o1", "ghost"])).toThrow();
  });
});
