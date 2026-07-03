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
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/** Respons login/register/refresh: access token JWT dikirim di body (disimpan di memori). */
export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  accessToken: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
