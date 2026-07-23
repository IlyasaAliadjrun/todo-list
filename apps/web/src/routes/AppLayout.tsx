import { Outlet, useNavigate, useParams } from "@tanstack/react-router";
import {
  Maximize,
  Menu,
  Minimize,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { PageTree } from "@/components/page/PageTree";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { logout } from "@/lib/auth.api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useWorkspaceStore } from "@/stores/workspace.store";

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const workspaceId = useWorkspaceStore((s) => s.selectedId);
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const selectedPageId = params.pageId as string | undefined;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  // Mode fokus: sembunyikan navbar + sidebar, hanya workspace. Opsional dibarengi
  // fullscreen browser sungguhan; disinkronkan lewat event fullscreenchange.
  const [focusMode, setFocusMode] = useState(false);

  function enterFocus() {
    setFocusMode(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  function exitFocus() {
    setFocusMode(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && exitFocus();
    const onFsChange = () => {
      // Keluar fullscreen browser (mis. tekan Esc) → keluar mode fokus juga.
      if (!document.fullscreenElement) setFocusMode(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [focusMode]);

  async function onLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mode fokus: tombol kecil mengambang untuk keluar (navbar disembunyikan). */}
      {focusMode && (
        <button
          type="button"
          onClick={exitFocus}
          className="fixed right-3 top-3 z-50 flex items-center gap-1 rounded-md border bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur hover:bg-secondary hover:text-foreground"
          title="Keluar mode fokus (Esc)"
        >
          <Minimize className="h-3.5 w-3.5" /> Keluar fokus
        </button>
      )}

      <header
        className={cn(
          "sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b bg-background px-4 py-3 sm:px-6",
          focusMode && "hidden",
        )}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary md:hidden"
            aria-label="Buka/tutup sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setDesktopCollapsed((v) => !v)}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground md:flex"
            aria-label={desktopCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
            title={desktopCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
          >
            {desktopCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
          <span className="shrink-0 font-bold">My Notepad</span>
          <WorkspaceSwitcher />
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            title="Cari (Ctrl/Cmd+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cari</span>
            <kbd className="hidden rounded bg-secondary px-1 text-[10px] sm:inline">⌘K</kbd>
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/profile" })}
            title="Profil saya"
            className="hidden max-w-[30vw] truncate rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground lg:inline"
          >
            {user?.email}
          </button>
          {user?.isSuperAdmin && (
            <button
              type="button"
              onClick={() => navigate({ to: "/admin" })}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Panel superadmin"
              title="Panel superadmin"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate({ to: "/settings" })}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Konfigurasi workspace"
            title="Konfigurasi workspace"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={enterFocus}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground md:flex"
            aria-label="Mode fokus (layar penuh)"
            title="Mode fokus — hanya workspace (Esc untuk keluar)"
          >
            <Maximize className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <Button size="sm" variant="outline" onClick={onLogout}>
            Keluar
          </Button>
        </div>
      </header>

      <CommandPalette />

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "w-64 shrink-0 flex-col border-r bg-background p-2",
            sidebarOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden",
            focusMode ? "md:!hidden" : desktopCollapsed ? "md:!hidden" : "md:!static md:!z-auto md:!flex",
          )}
        >
          {workspaceId ? (
            <PageTree
              workspaceId={workspaceId}
              selectedId={selectedPageId}
              onNavigate={() => setSidebarOpen(false)}
            />
          ) : (
            <p className="p-2 text-sm text-muted-foreground">Pilih workspace…</p>
          )}
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
