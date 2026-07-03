import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/** Tema awal: dari localStorage bila ada, kalau tidak ikuti preferensi sistem. */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Terapkan tema dengan menamb/menghapus class `dark` di <html> (Tailwind darkMode: class). */
function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Terapkan tema langsung saat store dibuat (import awal) untuk hindari flash.
  theme: (() => {
    const initial = getInitialTheme();
    applyTheme(initial);
    return initial;
  })(),
  setTheme: (theme) => {
    applyTheme(theme);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, theme);
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));
