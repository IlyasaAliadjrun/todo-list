import {
  PagePermissionsResponseSchema,
  type PagePermissionsResponse,
  type SetPagePermissionInput,
} from "@notion/shared";
import { apiFetch } from "@/lib/http";

export function getPermissions(pageId: string): Promise<PagePermissionsResponse> {
  return apiFetch(`/pages/${pageId}/permissions`, {}, PagePermissionsResponseSchema);
}

export function setPermission(
  pageId: string,
  input: SetPagePermissionInput,
): Promise<PagePermissionsResponse> {
  return apiFetch(
    `/pages/${pageId}/permissions`,
    { method: "PUT", body: JSON.stringify(input) },
    PagePermissionsResponseSchema,
  );
}

export function removePermission(
  pageId: string,
  permissionId: string,
): Promise<PagePermissionsResponse> {
  return apiFetch(
    `/pages/${pageId}/permissions/${permissionId}`,
    { method: "DELETE" },
    PagePermissionsResponseSchema,
  );
}
