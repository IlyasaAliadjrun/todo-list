import {
  FavoritePageSchema,
  FavoriteStatusSchema,
  type FavoritePage,
  type FavoriteStatus,
} from "@notion/shared";
import { z } from "zod";
import { apiFetch } from "@/lib/http";

export function addFavorite(pageId: string): Promise<FavoriteStatus> {
  return apiFetch(`/pages/${pageId}/favorite`, { method: "POST" }, FavoriteStatusSchema);
}

export function removeFavorite(pageId: string): Promise<FavoriteStatus> {
  return apiFetch(`/pages/${pageId}/favorite`, { method: "DELETE" }, FavoriteStatusSchema);
}

export function listFavorites(workspaceId: string): Promise<FavoritePage[]> {
  return apiFetch(`/workspaces/${workspaceId}/favorites`, {}, z.array(FavoritePageSchema));
}
