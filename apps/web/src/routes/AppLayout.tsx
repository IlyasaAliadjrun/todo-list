import { Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import { useState } from "react";
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

  async function onLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary md:hidden"
            aria-label="Buka/tutup sidebar"
          >
            <Menu className="h-5 w-5" />
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
          <span className="hidden max-w-[30vw] truncate text-sm text-muted-foreground lg:inline">
            {user?.email}
          </span>
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
            "w-64 shrink-0 flex-col border-r bg-background p-2 md:!static md:!z-auto md:!flex",
            sidebarOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden",
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
