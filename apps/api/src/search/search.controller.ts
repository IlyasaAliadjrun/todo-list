import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import type { SearchResult } from "@notion/shared";
import { AuthenticatedUser } from "../auth/auth.constants";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SearchService } from "./search.service";

@Controller("workspaces/:id/search")
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  run(
    @Param("id") workspaceId: string,
    @Query("q") q = "",
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SearchResult[]> {
    return this.search.search(workspaceId, user.id, q);
  }
}
