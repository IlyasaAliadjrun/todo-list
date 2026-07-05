import {
  PageSchema,
  PageTreeNodeSchema,
  type CreatePageInput,
  type MovePageInput,
  type Page,
  type PageTreeNode,
  type UpdatePageInput,
} from "@notion/shared";
import { z } from "zod";
import { apiFetch } from "@/lib/http";

const PageTreeSchema = z.array(PageTreeNodeSchema);
const PageListSchema = z.array(PageSchema);

export function getPageTree(workspaceId: string): Promise<PageTreeNode[]> {
  return apiFetch(`/workspaces/${workspaceId}/pages/tree`, {}, PageTreeSchema);
}

export function getTrash(workspaceId: string): Promise<Page[]> {
  return apiFetch(`/workspaces/${workspaceId}/trash`, {}, PageListSchema);
}

export function getPage(id: string): Promise<Page> {
  return apiFetch(`/pages/${id}`, {}, PageSchema);
}

export function createPage(workspaceId: string, input: CreatePageInput = {}): Promise<Page> {
  return apiFetch(
    `/workspaces/${workspaceId}/pages`,
    { method: "POST", body: JSON.stringify(input) },
    PageSchema,
  );
}

export function updatePage(id: string, input: UpdatePageInput): Promise<Page> {
  return apiFetch(`/pages/${id}`, { method: "PATCH", body: JSON.stringify(input) }, PageSchema);
}

export function movePage(id: string, input: MovePageInput): Promise<Page> {
  return apiFetch(`/pages/${id}/move`, { method: "POST", body: JSON.stringify(input) }, PageSchema);
}

export function archivePage(id: string): Promise<{ archived: number }> {
  return apiFetch(`/pages/${id}/archive`, { method: "POST" }, z.object({ archived: z.number() }));
}

export function restorePage(id: string): Promise<Page> {
  return apiFetch(`/pages/${id}/restore`, { method: "POST" }, PageSchema);
}

export function deletePage(id: string): Promise<void> {
  return apiFetch(`/pages/${id}`, { method: "DELETE" });
}
