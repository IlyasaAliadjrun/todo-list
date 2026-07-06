import { Injectable, NotFoundException } from "@nestjs/common";
import type { SearchResult } from "@notion/shared";
import { PermissionService } from "../permission/permission.service";
import { PrismaService } from "../prisma/prisma.service";

interface SearchRow {
  id: string;
  title: string;
  icon: string | null;
  snippet: string;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  /** Full-text search halaman (title + konten) dalam workspace, difilter permission. */
  async search(workspaceId: string, userId: string, rawQuery: string): Promise<SearchResult[]> {
    const resolver = await this.permissions.buildResolver(workspaceId, userId);
    if (!resolver) throw new NotFoundException("Workspace tidak ditemukan");

    const query = rawQuery.trim();
    if (!query) return [];

    const rows = await this.prisma.$queryRaw<SearchRow[]>`
      SELECT p.id, p.title, p.icon,
             ts_headline(
               'simple',
               coalesce(NULLIF(p."searchText", ''), p.title),
               websearch_to_tsquery('simple', ${query}),
               'MaxWords=18, MinWords=6, ShortWord=2'
             ) AS snippet
      FROM "Page" p
      WHERE p."workspaceId" = ${workspaceId}
        AND p."isArchived" = false
        AND p."searchVector" @@ websearch_to_tsquery('simple', ${query})
      ORDER BY ts_rank(p."searchVector", websearch_to_tsquery('simple', ${query})) DESC
      LIMIT 30;
    `;

    // Hanya kembalikan halaman yang boleh dilihat user (>= VIEW).
    return rows
      .filter((r) => resolver(r.id) !== null)
      .slice(0, 20)
      .map((r) => ({ id: r.id, title: r.title, icon: r.icon, snippet: r.snippet }));
  }
}
