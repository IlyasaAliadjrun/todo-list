import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { FloatingMenu } from "@/components/ui/FloatingMenu";
import { THEME_LABELS, THEME_PREFS, useThemeStore, type ThemePref } from "@/stores/theme.store";

const ICONS: Record<ThemePref, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
  sepia: Palette,
  solarized: Palette,
  nord: Palette,
};

/** Titik pratinjau warna tiap tema (warna literal, bukan token tema aktif). */
const SWATCH: Record<ThemePref, string> = {
  system: "bg-gradient-to-r from-white to-slate-800",
  light: "bg-white",
  dark: "bg-slate-900",
  sepia: "bg-[#f2ead8]",
  solarized: "bg-[#fdf6e3]",
  nord: "bg-[#2e3440]",
};

/** Pemilih tema: Sistem/Terang/Gelap + tema warna (Sepia, Solarized, Nord). */
export function ThemeToggle() {
  const pref = useThemeStore((s) => s.pref);
  const setTheme = useThemeStore((s) => s.setTheme);
  const Icon = ICONS[pref];

  return (
    <FloatingMenu
      ariaLabel="Pilih tema"
      width={180}
      triggerClassName="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
      trigger={<Icon className="h-4 w-4" />}
    >
      {(close) => (
        <div className="space-y-0.5">
          <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tema
          </p>
          {THEME_PREFS.map((p) => {
            const PIcon = ICONS[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setTheme(p);
                  close();
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-secondary"
              >
                <span className={`h-3.5 w-3.5 shrink-0 rounded-full border ${SWATCH[p]}`} />
                <PIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{THEME_LABELS[p]}</span>
                {pref === p && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </FloatingMenu>
  );
}
