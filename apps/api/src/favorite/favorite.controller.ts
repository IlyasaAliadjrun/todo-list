import { Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { FavoritePage, FavoriteStatus } from "@notion/shared";
import { AuthenticatedUser } from "../auth/auth.constants";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FavoriteService } from "./favorite.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private readonly favorites: FavoriteService) {}

  @Post("pages/:id/favorite")
  add(
    @Param("id") pageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FavoriteStatus> {
    return this.favorites.favorite(pageId, user.id);
  }

  @Delete("pages/:id/favorite")
  remove(
    @Param("id") pageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FavoriteStatus> {
    return this.favorites.unfavorite(pageId, user.id);
  }

  @Get("workspaces/:id/favorites")
  list(
    @Param("id") workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FavoritePage[]> {
    return this.favorites.list(workspaceId, user.id);
  }
}
