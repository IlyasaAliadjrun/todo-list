import type { Page, PageTreeNode } from "@notion/shared";

/** Edge minimal untuk kalkulasi tree (id + parent). */
export interface PageEdge {
  id: string;
  parentId: string | null;
}

/** Susun daftar page flat menjadi tree bersarang, terurut by `order` per level. */
export function buildTree(pages: Page[]): PageTreeNode[] {
  const byId = new Map<string, PageTreeNode>();
  for (const p of pages) byId.set(p.id, { ...p, children: [] });

  const roots: PageTreeNode[] = [];
  for (const p of pages) {
    const node = byId.get(p.id);
    if (!node) continue;
    const parent = p.parentId ? byId.get(p.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: PageTreeNode[]): void => {
    nodes.sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

/** Kumpulkan id sebuah page + SEMUA turunannya (untuk archive/restore/delete subtree). */
export function collectSubtreeIds(edges: PageEdge[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const e of edges) {
    if (!e.parentId) continue;
    const arr = childrenOf.get(e.parentId) ?? [];
    arr.push(e.id);
    childrenOf.set(e.parentId, arr);
  }

  const result: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    result.push(id);
    for (const child of childrenOf.get(id) ?? []) stack.push(child);
  }
  return result;
}

/**
 * True bila memindahkan `pageId` ke bawah `newParentId` akan membentuk cycle,
 * yaitu newParentId adalah pageId itu sendiri atau salah satu turunannya.
 */
export function wouldCreateCycle(
  edges: PageEdge[],
  pageId: string,
  newParentId: string | null,
): boolean {
  if (!newParentId) return false;
  if (newParentId === pageId) return true;

  const parentOf = new Map<string, string | null>();
  for (const e of edges) parentOf.set(e.id, e.parentId);

  const seen = new Set<string>();
  let cur: string | null = newParentId;
  while (cur) {
    if (cur === pageId) return true;
    if (seen.has(cur)) break; // jaga-jaga bila data sudah korup
    seen.add(cur);
    cur = parentOf.get(cur) ?? null;
  }
  return false;
}
