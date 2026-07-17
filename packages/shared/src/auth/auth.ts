import { z } from "zod";

/** Batasan kredensial dasar. Verifikasi email/2FA di luar scope Fase 1 (backlog). */
export const emailSchema = z.string().trim().toLowerCase().email("Email tidak valid");
export const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(128, "Password terlalu panjang");

export const RegisterInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(80).optional(),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password wajib diisi"),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

/** Representasi user yang aman dikirim ke klien (tanpa passwordHash). */
export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  /** true bila user adalah superadmin (dari SUPERADMIN_EMAILS). */
  isSuperAdmin: z.boolean(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/** Ubah profil sendiri. `name` null/"" = kosongkan. */
export const UpdateProfileInputSchema = z.object({
  name: z.string().trim().max(80).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

/** Ganti password sendiri (butuh password lama). */
export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;

/** Minta link reset password ke email. */
export const ForgotPasswordInputSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

/** Tukar token reset (dari link email) dengan password baru. */
export const ResetPasswordInputSchema = z.object({
  token: z.string().min(1, "Token wajib diisi"),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

/** Respons login/register/refresh: access token JWT dikirim di body (disimpan di memori). */
export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  accessToken: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
