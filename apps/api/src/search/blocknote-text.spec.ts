import { blockNoteToText } from "@notion/shared";
import { describe, expect, it } from "vitest";

describe("blockNoteToText", () => {
  it("mengekstrak teks dari paragraf & heading", () => {
    const doc = [
      { type: "heading", content: [{ type: "text", text: "Judul", styles: {} }] },
      { type: "paragraph", content: [{ type: "text", text: "Isi paragraf.", styles: {} }] },
    ];
    expect(blockNoteToText(doc)).toBe("Judul Isi paragraf.");
  });

  it("menelusuri children (nested) & link inline", () => {
    const doc = [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Lihat", styles: {} },
          { type: "link", content: [{ type: "text", text: "situs", styles: {} }] },
        ],
        children: [{ type: "paragraph", content: [{ type: "text", text: "anak", styles: {} }] }],
      },
    ];
    expect(blockNoteToText(doc)).toBe("Lihat situs anak");
  });

  it("aman untuk input kosong / bukan array", () => {
    expect(blockNoteToText(null)).toBe("");
    expect(blockNoteToText([])).toBe("");
    expect(blockNoteToText([{ type: "divider" }])).toBe("");
  });
});
