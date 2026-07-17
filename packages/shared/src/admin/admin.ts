import { z } from "zod";
import { passwordSchema } from "../auth/auth";

/** Ringkasan user untuk halaman admin (tanpa data sensitif). */
export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  isSuperAdmin: z.boolean(),
  createdAt: z.string(),
  /** Jumlah workspace yang diikuti + sesi aktif (untuk gambaran cepat). */
  workspaceCount: z.number().int().nonnegative(),
  activeSessions: z.number().int().nonnegative(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

/** Superadmin menetapkan password baru user (tanpa perlu password lama). */
export const AdminSetPasswordInputSchema = z.object({ newPassword: passwordSchema });
export type AdminSetPasswordInput = z.infer<typeof AdminSetPasswordInputSchema>;
