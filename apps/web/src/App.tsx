import { HealthStatus } from "@/components/HealthStatus";

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Notion Clone</h1>
        <p className="text-sm text-muted-foreground">Fase 0 — Fondasi &amp; Infrastruktur</p>
      </div>
      <HealthStatus />
    </main>
  );
}
