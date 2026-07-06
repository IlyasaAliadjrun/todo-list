import { resolveEffectiveLevel, type AncestorNode } from "@notion/shared";
import { describe, expect, it } from "vitest";

const U = "user-1";
const chain = (...nodes: AncestorNode["permissions"][]): AncestorNode[] =>
  nodes.map((permissions) => ({ permissions }));

describe("resolveEffectiveLevel", () => {
  it("bukan anggota → null", () => {
    expect(resolveEffectiveLevel({ userId: U, role: null, chain: chain([]) })).toBeNull();
  });

  it("OWNER/ADMIN → EDIT walau ada pembatasan", () => {
    const restricted = chain([{ subjectType: "USER", subjectId: "other", level: "VIEW" }]);
    expect(resolveEffectiveLevel({ userId: U, role: "OWNER", chain: restricted })).toBe("EDIT");
    expect(resolveEffectiveLevel({ userId: U, role: "ADMIN", chain: restricted })).toBe("EDIT");
  });

  it("MEMBER tanpa permission di seluruh rantai → default EDIT (kompatibel Fase 2)", () => {
    expect(resolveEffectiveLevel({ userId: U, role: "MEMBER", chain: chain([], []) })).toBe("EDIT");
  });

  it("grant WORKSPACE berlaku untuk semua anggota", () => {
    const c = chain([{ subjectType: "WORKSPACE", subjectId: "ws", level: "VIEW" }]);
    expect(resolveEffectiveLevel({ userId: U, role: "MEMBER", chain: c })).toBe("VIEW");
  });

  it("ambil level tertinggi dari grant yang cocok (USER + WORKSPACE)", () => {
    const c = chain([
      { subjectType: "WORKSPACE", subjectId: "ws", level: "VIEW" },
      { subjectType: "USER", subjectId: U, level: "EDIT" },
    ]);
    expect(resolveEffectiveLevel({ userId: U, role: "MEMBER", chain: c })).toBe("EDIT");
  });

  it("halaman punya permission tapi tak ada yang cocok → null (privat)", () => {
    const c = chain([{ subjectType: "USER", subjectId: "someone-else", level: "EDIT" }]);
    expect(resolveEffectiveLevel({ userId: U, role: "MEMBER", chain: c })).toBeNull();
  });

  it("mewarisi permission dari ancestor terdekat", () => {
    // halaman (kosong) → induk (WORKSPACE COMMENT)
    const c = chain([], [{ subjectType: "WORKSPACE", subjectId: "ws", level: "COMMENT" }]);
    expect(resolveEffectiveLevel({ userId: U, role: "MEMBER", chain: c })).toBe("COMMENT");
  });

  it("override: permission di halaman mengalahkan warisan induk", () => {
    const c = chain(
      [{ subjectType: "USER", subjectId: U, level: "VIEW" }], // halaman: VIEW
      [{ subjectType: "WORKSPACE", subjectId: "ws", level: "EDIT" }], // induk: EDIT
    );
    expect(resolveEffectiveLevel({ userId: U, role: "MEMBER", chain: c })).toBe("VIEW");
  });
});
