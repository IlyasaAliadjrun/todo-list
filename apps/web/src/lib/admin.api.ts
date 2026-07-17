import { AdminUserSchema, type AdminUser } from "@notion/shared";
import { z } from "zod";
import { apiFetch } from "@/lib/http";

export function listUsers(): Promise<AdminUser[]> {
  return apiFetch("/admin/users", {}, z.array(AdminUserSchema));
}

export function setUserPassword(userId: string, newPassword: string): Promise<void> {
  return apiFetch(`/admin/users/${userId}/password`, {
    method: "POST",
    body: JSON.stringify({ newPassword }),
  });
}

export function revokeUserSessions(userId: string): Promise<{ revoked: number }> {
  return apiFetch(`/admin/users/${userId}/revoke-sessions`, { method: "POST" });
}

export function deleteUser(userId: string): Promise<void> {
  return apiFetch(`/admin/users/${userId}`, { method: "DELETE" });
}
