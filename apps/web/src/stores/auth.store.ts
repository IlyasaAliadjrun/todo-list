import type { AuthUser } from "@notion/shared";
import { create } from "zustand";

type AuthStatus = "loading" | "authed" | "anon";

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
}

/**
 * Sesi auth di memori. Access token TIDAK disimpan ke localStorage (mitigasi XSS);
 * refresh token ada di cookie httpOnly. Saat reload, sesi dipulihkan via /auth/refresh.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ status: "authed", accessToken, user }),
  clearSession: () => set({ status: "anon", accessToken: null, user: null }),
}));
