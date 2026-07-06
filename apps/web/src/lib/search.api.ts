import { SearchResultSchema, type SearchResult } from "@notion/shared";
import { z } from "zod";
import { apiFetch } from "@/lib/http";

export function searchPages(workspaceId: string, q: string): Promise<SearchResult[]> {
  return apiFetch(
    `/workspaces/${workspaceId}/search?q=${encodeURIComponent(q)}`,
    {},
    z.array(SearchResultSchema),
  );
}
