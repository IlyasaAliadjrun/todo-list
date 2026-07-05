import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  CreatePageInputSchema,
  MovePageInputSchema,
  UpdatePageInputSchema,
  type CreatePageInput,
  type MovePageInput,
  type Page,
  type PageTreeNode,
  type UpdatePageInput,
} from "@notion/shared";
import { AuthenticatedUser } from "../auth/auth.constants";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PageService } from "./page.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class PageController {
  constructor(private readonly pages: PageService) {}

  @Get("workspaces/:workspaceId/pages/tree")
  tree(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PageTreeNode[]> {
    return this.pages.getTree(workspaceId, user.id);
  }

  @Post("workspaces/:workspaceId/pages")
  create(
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(CreatePageInputSchema)) dto: CreatePageInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Page> {
    return this.pages.create(workspaceId, user.id, dto);
  }

  @Get("workspaces/:workspaceId/trash")
  trash(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Page[]> {
    return this.pages.getTrash(workspaceId, user.id);
  }

  @Get("pages/:id")
  get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<Page> {
    return this.pages.getPage(id, user.id);
  }

  @Patch("pages/:id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdatePageInputSchema)) dto: UpdatePageInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Page> {
    return this.pages.update(id, user.id, dto);
  }

  @Post("pages/:id/move")
  move(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(MovePageInputSchema)) dto: MovePageInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Page> {
    return this.pages.move(id, user.id, dto);
  }

  @Post("pages/:id/archive")
  @HttpCode(HttpStatus.OK)
  archive(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ archived: number }> {
    return this.pages.archive(id, user.id);
  }

  @Post("pages/:id/restore")
  @HttpCode(HttpStatus.OK)
  restore(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<Page> {
    return this.pages.restore(id, user.id);
  }

  @Delete("pages/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.pages.remove(id, user.id);
  }
}
