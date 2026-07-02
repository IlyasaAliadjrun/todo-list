import { useQuery } from "@tanstack/react-query";
import type { DependencyStatus } from "@notion/shared";
import { Button } from "@/components/ui/button";
import { fetchHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

function Dot({ status }: { status: DependencyStatus }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        status === "up" ? "bg-emerald-500" : "bg-red-500",
      )}
      aria-hidden
    />
  );
}

export function HealthStatus() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 10_000,
  });

  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Status Sistem</h1>
        {data && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
              data.status === "ok"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {data.status}
          </span>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Memeriksa status…</p>}

      {isError && (
        <p className="text-sm text-destructive">
          Gagal menghubungi API: {(error as Error).message}
        </p>
      )}

      {data && (
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Dot status={data.services.database} /> Database (PostgreSQL)
            </span>
            <span className="text-muted-foreground">{data.services.database}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Dot status={data.services.redis} /> Redis
            </span>
            <span className="text-muted-foreground">{data.services.redis}</span>
          </li>
          <li className="pt-2 text-xs text-muted-foreground">
            uptime {data.uptime}s · diperbarui {new Date(data.timestamp).toLocaleTimeString()}
          </li>
        </ul>
      )}

      <div className="mt-5">
        <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? "Menyegarkan…" : "Segarkan"}
        </Button>
      </div>
    </div>
  );
}
