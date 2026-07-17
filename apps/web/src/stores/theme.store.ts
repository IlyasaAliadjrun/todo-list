import { create } from "zustand";

/** Pilihan tema user. "system" mengikuti preferensi OS. */
export type ThemePref = "system" | "light" | "dark" | "sepia" | "solarized" | "nord";
/** Basis terang/gelap hasil resolusi — dipakai komponen yang hanya kenal light/dark (BlockNote). */
export type BaseTheme = "light" | "dark";

export const THEME_PREFS: ThemePref[] = ["system", "light", "dark", "sepia", "solarized", "nord"];
export const THEME_LABELS: Record<ThemePref, string> = {
  system: "Sistem",
  light: "Terang",
  dark: "Gelap",
  sepia: "Sepia",
  solarized: "Solarized",
  nord: "Nord",
};

/** Tema yang basisnya gelap (butuh class .dark agar varian `dark:` Tailwind aktif). */
const DARK_BASED = new Set<string>(["dark", "nord"]);

const STORAGE_KEY = "theme";

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function isPref(v: unknown): v is ThemePref {
  return typeof v === "string" && (THEME_PREFS as string[]).includes(v);
}

function getInitialPref(): ThemePref {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isPref(stored) ? stored : "system";
}

/** Tema efektif (pref "system" → light/dark sesuai OS). */
function resolve(pref: ThemePref): Exclude<ThemePref, "system"> {
  if (pref !== "system") return pref;
  return prefersDark() ? "dark" : "light";
}

function baseOf(pref: ThemePref): BaseTheme {
  return DARK_BASED.has(resolve(pref)) ? "dark" : "light";
}

/** Terapkan: class `dark` (Tailwind darkMode: class) + atribut data-theme (palet). */
function applyTheme(pref: ThemePref): BaseTheme {
  const base = baseOf(pref);
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", base === "dark");
    document.documentElement.setAttribute("data-theme", resolve(pref));
  }
  return base;
}

interface ThemeState {
  /** Pilihan user (termasuk "system"). */
  pref: ThemePref;
  /** Basis light/dark hasil resolusi — untuk BlockNote dkk. */
  theme: BaseTheme;
  setTheme: (pref: ThemePref) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getInitialPref();
  const base = applyTheme(initial); // terapkan saat import agar tak ada flash

  // Ikuti perubahan OS selama pref masih "system".
  if (typeof window !== "undefined") {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (get().pref === "system") set({ theme: applyTheme("system") });
    });
  }

  return {
    pref: initial,
    theme: base,
    setTheme: (pref) => {
      const next = applyTheme(pref);
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, pref);
      set({ pref, theme: next });
    },
    toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  };
});
