import { describe, expect, it } from "vitest";
import * as Y from "yjs";

/**
 * Sanity CRDT: dua dokumen yang diedit terpisah lalu bertukar update HARUS
 * konvergen ke state yang sama (dasar kolaborasi real-time Yjs).
 */
describe("Yjs convergence", () => {
  it("konvergen setelah tukar update dua arah", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();

    a.getArray<string>("blocks").insert(0, ["dari-A"]);
    b.getArray<string>("blocks").insert(0, ["dari-B"]);

    // Tukar state dua arah (seperti sinkronisasi via server).
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));

    expect(a.getArray("blocks").toJSON()).toEqual(b.getArray("blocks").toJSON());
    expect(a.getArray("blocks").length).toBe(2);
  });

  it("snapshot biner dapat memuat ulang state (persistensi)", () => {
    const a = new Y.Doc();
    a.getMap("meta").set("title", "Halo");
    const snapshot = Y.encodeStateAsUpdate(a);

    const restored = new Y.Doc();
    Y.applyUpdate(restored, snapshot);
    expect(restored.getMap("meta").get("title")).toBe("Halo");
  });
});
