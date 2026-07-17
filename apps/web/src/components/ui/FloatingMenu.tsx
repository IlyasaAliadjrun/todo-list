import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Registri menu bersarang. Tiap menu yang terbuka mendaftarkan elemen portal-nya
 * ke menu induk, supaya induk tak menganggap klik di menu anak sebagai "klik luar"
 * (tiap menu di-portal ke <body>, jadi secara DOM mereka bersaudara, bukan bersarang).
 */
interface MenuNest {
  addChild: (el: HTMLElement) => void;
  removeChild: (el: HTMLElement) => void;
}
const MenuNestContext = createContext<MenuNest | null>(null);

/**
 * Menu mengambang yang dirender via portal ke <body> dengan posisi `fixed`, agar
 * TIDAK ter-clip oleh kontainer `overflow` (mis. tabel database) dan lepas dari
 * area contentEditable BlockNote. Tutup saat klik-luar / Escape. Mendukung
 * menu bersarang (mis. dropdown tipe di dalam menu setelan kolom).
 */
export function FloatingMenu({
  trigger,
  triggerClassName,
  ariaLabel,
  width = 224,
  children,
}: {
  trigger: React.ReactNode;
  triggerClassName?: string;
  ariaLabel?: string;
  width?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const parent = useContext(MenuNestContext);
  const childEls = useRef<Set<HTMLElement>>(new Set());
  const nest = useMemo<MenuNest>(
    () => ({
      addChild: (el) => childEls.current.add(el),
      removeChild: (el) => childEls.current.delete(el),
    }),
    [],
  );

  // Daftarkan portal menu ini ke induk selama terbuka.
  useEffect(() => {
    if (!open || !parent) return;
    const el = menuRef.current;
    if (!el) return;
    parent.addChild(el);
    return () => parent.removeChild(el);
  }, [open, parent]);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    const top = Math.min(r.bottom + 4, window.innerHeight - 8);
    setPos({ top, left });
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      // Klik di dalam menu anak (portal terpisah) bukan klik-luar.
      for (const el of childEls.current) if (el.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <MenuNestContext.Provider value={nest}>
            <div
              ref={menuRef}
              style={{ position: "fixed", top: pos.top, left: pos.left, width }}
              className="z-50 max-h-[70vh] overflow-y-auto rounded-md border bg-background p-2 text-sm text-foreground shadow-lg"
            >
              {children(() => setOpen(false))}
            </div>
          </MenuNestContext.Provider>,
          document.body,
        )}
    </>
  );
}
