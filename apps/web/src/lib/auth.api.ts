import {
  AuthResponseSchema,
  AuthUserSchema,
  type AuthResponse,
  type AuthUser,
  type ChangePasswordInput,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput,
} from "@notion/shared";
import { apiFetch } from "@/lib/http";
import { useAuthStore } from "@/stores/auth.store";

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const res = await apiFetch(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    AuthResponseSchema,
  );
  useAuthStore.getState().setSession(res.accessToken, res.user);
  return res;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const res = await apiFetch(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    AuthResponseSchema,
  );
  useAuthStore.getState().setSession(res.accessToken, res.user);
  return res;
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
  useAuthStore.getState().clearSession();
}

export function fetchMe(): Promise<AuthUser> {
  return apiFetch("/auth/me", {}, AuthUserSchema);
}

export async function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  const user = await apiFetch(
    "/auth/me",
    { method: "PATCH", body: JSON.stringify(input) },
    AuthUserSchema,
  );
  const { accessToken } = useAuthStore.getState();
  if (accessToken) useAuthStore.getState().setSession(accessToken, user);
  return user;
}

/** Ganti password: server mencabut sesi lama & memberi sesi baru untuk perangkat ini. */
export async function changePassword(input: ChangePasswordInput): Promise<AuthResponse> {
  const res = await apiFetch(
    "/auth/change-password",
    { method: "POST", body: JSON.stringify(input) },
    AuthResponseSchema,
  );
  useAuthStore.getState().setSession(res.accessToken, res.user);
  return res;
}
