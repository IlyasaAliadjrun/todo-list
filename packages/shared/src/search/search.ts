import { z } from "zod";

/**
 * Ekstrak teks polos dari dokumen BlockNote (array block, rekursif) untuk indeks
 * full-text search. Menelusuri inline content (termasuk link) dan children.
 */
export function blockNoteToText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];

  const walkInline = (content: unknown): void => {
    if (!Array.isArray(content)) return;
    for (const node of content) {
      if (!node || typeof node !== "object") continue;
      const n = node as Record<string, unknown>;
      if (typeof n.text === "string") parts.push(n.text);
      else if (Array.isArray(n.content)) walkInline(n.content); // mis. link
    }
  };

  const walkBlocks = (bs: unknown[]): void => {
    for (const b of bs) {
      if (!b || typeof b !== "object") continue;
      const block = b as Record<string, unknown>;
      if (Array.isArray(block.content)) walkInline(block.content);
      if (Array.isArray(block.children)) walkBlocks(block.children);
    }
  };

  walkBlocks(blocks);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export const SearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  snippet: z.string(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;
