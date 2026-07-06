import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FileText, Star } from "lucide-react";
import { listFavorites } from "@/lib/favorite.api";

interface Props {
  workspaceId: string;
  selectedId?: string;
  onNavigate?: () => void;
}

export function FavoritesSection({ workspaceId, selectedId, onNavigate }: Props) {
  const { data: favorites } = useQuery({
    queryKey: ["favorites", workspaceId],
    queryFn: () => listFavorites(workspaceId),
  });

  if (!favorites || favorites.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center gap-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Star className="h-3 w-3" /> Favorit
      </div>
      <ul>
        {favorites.map((f) => (
          <li key={f.id}>
            <Link
              to="/p/$pageId"
              params={{ pageId: f.id }}
              onClick={() => onNavigate?.()}
              className={
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm " +
                (f.id === selectedId ? "bg-secondary" : "hover:bg-secondary/60")
              }
            >
              {f.icon ? (
                <span className="text-sm leading-none">{f.icon}</span>
              ) : (
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">{f.title || "Untitled"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
