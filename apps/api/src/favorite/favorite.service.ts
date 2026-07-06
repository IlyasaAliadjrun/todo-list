import { Injectable, NotFoundException } from "@nestjs/common";
import type { FavoritePage, FavoriteStatus } from "@notion/shared";
import { PermissionService } from "../permission/permission.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FavoriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  async favorite(pageId: string, userId: string): Promise<FavoriteStatus> {
    await this.permissions.requireLevel(pageId, userId, "VIEW");
    await this.prisma.favorite.upsert({
      where: { userId_pageId: { userId, pageId } },
      create: { userId, pageId },
      update: {},
    });
    return { favorited: true };
  }

  async unfavorite(pageId: string, userId: string): Promise<FavoriteStatus> {
    await this.prisma.favorite.deleteMany({ where: { userId, pageId } });
    return { favorited: false };
  }

  async list(workspaceId: string, userId: string): Promise<FavoritePage[]> {
    const resolver = await this.permissions.buildResolver(workspaceId, userId);
    if (!resolver) throw new NotFoundException("Workspace tidak ditemukan");

    const favs = await this.prisma.favorite.findMany({
      where: { userId, page: { workspaceId, isArchived: false } },
      select: { page: { select: { id: true, title: true, icon: true } } },
      orderBy: { createdAt: "desc" },
    });
    return favs.map((f) => f.page).filter((p) => resolver(p.id) !== null);
  }
}
