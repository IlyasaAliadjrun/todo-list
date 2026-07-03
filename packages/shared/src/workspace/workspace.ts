import { z } from "zod";

export const WorkspaceRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const WorkspaceTypeSchema = z.enum(["PERSONAL", "TEAM"]);
export type WorkspaceType = z.infer<typeof WorkspaceTypeSchema>;

/** Role yang boleh diberikan saat undang/ubah anggota (OWNER tidak bisa diberikan). */
export const AssignableRoleSchema = z.enum(["ADMIN", "MEMBER"]);
export type AssignableRole = z.infer<typeof AssignableRoleSchema>;

export const CreateWorkspaceInputSchema = z.object({
  name: z.string().trim().min(1, "Nama workspace wajib diisi").max(80),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>;

/** Ringkasan workspace + role user saat ini di dalamnya (untuk switcher & list). */
export const WorkspaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  type: WorkspaceTypeSchema,
  role: WorkspaceRoleSchema,
});
export type WorkspaceSummary = z.infer<typeof WorkspaceSummarySchema>;

export const WorkspaceMemberSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: WorkspaceRoleSchema,
  joinedAt: z.string(),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const InviteMemberInputSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  role: AssignableRoleSchema.default("MEMBER"),
});
export type InviteMemberInput = z.infer<typeof InviteMemberInputSchema>;

export const UpdateMemberRoleInputSchema = z.object({
  role: AssignableRoleSchema,
});
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleInputSchema>;

/** Respons pembuatan undangan. `token` HANYA dikembalikan sekali di sini
 *  (Fase 1 tanpa email; klien menyalin/menyampaikan token secara manual). */
export const InvitationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  email: z.string(),
  role: WorkspaceRoleSchema,
  expiresAt: z.string(),
  token: z.string().optional(),
});
export type Invitation = z.infer<typeof InvitationSchema>;

export const AcceptInvitationInputSchema = z.object({
  token: z.string().min(1, "Token undangan wajib diisi"),
});
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationInputSchema>;
