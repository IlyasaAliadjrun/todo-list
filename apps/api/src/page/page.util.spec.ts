import type { Page } from "@notion/shared";
import { describe, expect, it } from "vitest";
import { buildTree, collectSubtreeIds, wouldCreateCycle, type PageEdge } from "./page.util";

function page(id: string, parentId: string | null, order: string): Page {
  return {
    id,
    workspaceId: "ws",
    parentId,
    title: id,
    icon: null,
    coverUrl: null,
    order,
    isArchived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("buildTree", () => {
  it("menyusun tree bersarang & mengurutkan sibling by order", () => {
    const flat = [
      page("b", null, "a1"),
      page("a", null, "a0"),
      page("a2", "a", "a1"),
      page("a1", "a", "a0"),
    ];
    const tree = buildTree(flat);
    expect(tree.map((n) => n.id)).toEqual(["a", "b"]); // a0 < a1
    expect(tree[0].children.map((n) => n.id)).toEqual(["a1", "a2"]);
  });

  it("menjadikan node dengan parent hilang sebagai root", () => {
    const tree = buildTree([page("x", "ghost", "a0")]);
    expect(tree.map((n) => n.id)).toEqual(["x"]);
  });
});

describe("collectSubtreeIds", () => {
  const edges: PageEdge[] = [
    { id: "a", parentId: null },
    { id: "b", parentId: "a" },
    { id: "c", parentId: "b" },
    { id: "d", parentId: null },
  ];

  it("mengumpulkan root + seluruh turunan", () => {
    expect(collectSubtreeIds(edges, "a").sort()).toEqual(["a", "b", "c"]);
  });

  it("leaf hanya dirinya sendiri", () => {
    expect(collectSubtreeIds(edges, "c")).toEqual(["c"]);
  });
});

describe("wouldCreateCycle", () => {
  const edges: PageEdge[] = [
    { id: "a", parentId: null },
    { id: "b", parentId: "a" },
    { id: "c", parentId: "b" },
  ];

  it("menolak pindah ke diri sendiri", () => {
    expect(wouldCreateCycle(edges, "a", "a")).toBe(true);
  });

  it("menolak pindah ke turunannya sendiri", () => {
    expect(wouldCreateCycle(edges, "a", "c")).toBe(true);
  });

  it("mengizinkan pindah ke root (null)", () => {
    expect(wouldCreateCycle(edges, "b", null)).toBe(false);
  });

  it("mengizinkan pindah ke node non-turunan", () => {
    expect(wouldCreateCycle(edges, "c", "a")).toBe(false);
  });
});
