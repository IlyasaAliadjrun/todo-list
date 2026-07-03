import { Outlet, useNavigate } from "@tanstack/react-router";
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
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="font-bold">Notion Clone</span>
          <WorkspaceSwitcher />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
          <Button size="sm" variant="outline" onClick={onLogout}>
            Keluar
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
