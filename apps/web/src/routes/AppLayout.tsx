import { Outlet, useNavigate } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { logout } from "@/lib/auth.api";
import { useAuthStore } from "@/stores/auth.store";

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="shrink-0 font-bold">My Notepad</span>
          <WorkspaceSwitcher />
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden max-w-[40vw] truncate text-sm text-muted-foreground md:inline">
            {user?.email}
          </span>
          <ThemeToggle />
          <Button size="sm" variant="outline" onClick={onLogout}>
            Keluar
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
