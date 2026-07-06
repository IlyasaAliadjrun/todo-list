import { z } from "zod";
import type { WorkspaceRole } from "../workspace/workspace";

export const PermissionLevelSchema = z.enum(["VIEW", "COMMENT", "EDIT"]);
export type PermissionLevel = z.infer<typeof PermissionLevelSchema>;

export const PermissionSubjectSchema = z.enum(["USER", "WORKSPACE"]);
export type PermissionSubject = z.infer<typeof PermissionSubjectSchema>;

export const LEVEL_RANK: Record<PermissionLevel, number> = { VIEW: 1, COMMENT: 2, EDIT: 3 };

/** True bila `level` (boleh null) memenuhi minimal `min`. */
export function levelAtLeast(level: PermissionLevel | null, min: PermissionLevel): boolean {
  return level != null && LEVEL_RANK[level] >= LEVEL_RANK[min];
}

export interface PermissionGrant {
  subjectType: PermissionSubject;
  subjectId: string;
  level: PermissionLevel;
}

/** Satu node rantai ancestor (halaman → induk → … root); index 0 = halaman itu sendiri. */
export interface AncestorNode {
  permissions: PermissionGrant[];
}

/**
 * Level efektif user untuk sebuah halaman (lihat ADR 0008):
 * - Bukan anggota workspace → null (tanpa akses).
 * - OWNER/ADMIN → EDIT (pengelola).
 * - Selain itu: ancestor TERDEKAT yang punya permission = titik override untuk
 *   subtree-nya (grant cocok = USER milik user, atau WORKSPACE untuk semua anggota).
 *   Bila node itu punya permission tapi tak ada yang cocok → null (halaman privat).
 * - Tak ada permission di SELURUH rantai → default EDIT (kompatibel Fase 2).
 */
export function resolveEffectiveLevel(params: {
  userId: string;
  role: WorkspaceRole | null;
  chain: AncestorNode[];
}): PermissionLevel | null {
  const { userId, role, chain } = params;
  if (!role) return null;
  if (role === "OWNER" || role === "ADMIN") return "EDIT";

  for (const node of chain) {
    if (node.permissions.length === 0) continue;
    let best: PermissionLevel | null = null;
    for (const g of node.permissions) {
      const matches =
        g.subjectType === "WORKSPACE" || (g.subjectType === "USER" && g.subjectId === userId);
      if (matches && (best === null || LEVEL_RANK[g.level] > LEVEL_RANK[best])) best = g.level;
    }
    return best;
  }
  return "EDIT";
}

// ---- Kontrak API ----
export const SetPagePermissionInputSchema = z.object({
  subjectType: PermissionSubjectSchema,
  // USER: berikan `email` (tambah baru) atau `subjectId`/userId (ubah level).
  email: z.string().trim().toLowerCase().email().optional(),
  subjectId: z.string().optional(),
  level: PermissionLevelSchema,
});
export type SetPagePermissionInput = z.infer<typeof SetPagePermissionInputSchema>;

export const PagePermissionEntrySchema = z.object({
  id: z.string(),
  subjectType: PermissionSubjectSchema,
  subjectId: z.string(),
  label: z.string(),
  level: PermissionLevelSchema,
});
export type PagePermissionEntry = z.infer<typeof PagePermissionEntrySchema>;

export const PagePermissionsResponseSchema = z.object({
  myLevel: PermissionLevelSchema,
  canManage: z.boolean(),
  permissions: z.array(PagePermissionEntrySchema),
});
export type PagePermissionsResponse = z.infer<typeof PagePermissionsResponseSchema>;
