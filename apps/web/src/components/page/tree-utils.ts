import type { PageTreeNode } from "@notion/shared";
import { arrayMove } from "@dnd-kit/sortable";

/** Lebar indentasi per level (px) — juga dipakai menghitung projeksi drag. */
export const INDENT_WIDTH = 16;

export interface FlatItem {
  id: string;
  parentId: string | null;
  depth: number;
  title: string;
  icon: string | null;
  hasChildren: boolean;
  collapsed: boolean;
}

/** Ratakan tree (hanya node yang ter-expand) menjadi list berurutan + depth. */
export function flattenTree(
  nodes: PageTreeNode[],
  collapsed: Set<string>,
  parentId: string | null = null,
  depth = 0,
): FlatItem[] {
  const out: FlatItem[] = [];
  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    out.push({
      id: node.id,
      parentId,
      depth,
      title: node.title,
      icon: node.icon,
      hasChildren,
      collapsed: isCollapsed,
    });
    if (hasChildren && !isCollapsed) {
      out.push(...flattenTree(node.children, collapsed, node.id, depth + 1));
    }
  }
  return out;
}

/**
 * Sembunyikan TURUNAN dari id tertentu saat drag (node itu sendiri tetap ada),
 * supaya tak bisa drop ke dalam subtree-nya sendiri.
 */
export function removeDescendants(items: FlatItem[], id: string): FlatItem[] {
  const excluded = new Set<string>([id]);
  return items.filter((item) => {
    if (item.parentId && excluded.has(item.parentId)) {
      excluded.add(item.id);
      return false;
    }
    return true;
  });
}

export interface Projection {
  depth: number;
  parentId: string | null;
  afterId: string | null;
}

/**
 * Hitung target (parent + posisi) saat drag, dari offset horizontal pointer.
 * Diadaptasi dari contoh sortable-tree @dnd-kit.
 */
export function getProjection(
  items: FlatItem[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
): Projection {
  const overIndex = items.findIndex((i) => i.id === overId);
  const activeIndex = items.findIndex((i) => i.id === activeId);
  const activeItem = items[activeIndex];
  const newItems = arrayMove(items, activeIndex, overIndex);
  const previousItem = newItems[overIndex - 1];
  const nextItem = newItems[overIndex + 1];

  const dragDepth = Math.round(dragOffsetX / INDENT_WIDTH);
  const projected = activeItem.depth + dragDepth;
  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;
  const depth = Math.max(minDepth, Math.min(projected, maxDepth));

  const parentId = ((): string | null => {
    if (depth === 0 || !previousItem) return null;
    if (depth === previousItem.depth) return previousItem.parentId;
    if (depth > previousItem.depth) return previousItem.id;
    return (
      newItems
        .slice(0, overIndex)
        .reverse()
        .find((i) => i.depth === depth)?.parentId ?? null
    );
  })();

  // afterId = sibling terdekat DI ATAS drop dengan parent yang sama.
  let afterId: string | null = null;
  for (let i = overIndex - 1; i >= 0; i--) {
    const it = newItems[i];
    if (it.parentId === parentId) {
      afterId = it.id;
      break;
    }
    if (it.depth < depth) break; // sudah melewati induk
  }

  return { depth, parentId, afterId };
}
