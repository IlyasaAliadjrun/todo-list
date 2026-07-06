import { Body, Controller, Delete, Get, Param, Put, UseGuards } from "@nestjs/common";
import {
  SetPagePermissionInputSchema,
  type PagePermissionsResponse,
  type SetPagePermissionInput,
} from "@notion/shared";
import { AuthenticatedUser } from "../auth/auth.constants";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PermissionService } from "./permission.service";

@Controller("pages/:id/permissions")
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(private readonly permissions: PermissionService) {}

  @Get()
  list(
    @Param("id") pageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PagePermissionsResponse> {
    return this.permissions.listForPage(pageId, user.id);
  }

  @Put()
  set(
    @Param("id") pageId: string,
    @Body(new ZodValidationPipe(SetPagePermissionInputSchema)) dto: SetPagePermissionInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PagePermissionsResponse> {
    return this.permissions.setForPage(pageId, user.id, dto);
  }

  @Delete(":permissionId")
  remove(
    @Param("id") pageId: string,
    @Param("permissionId") permissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PagePermissionsResponse> {
    return this.permissions.removeForPage(pageId, permissionId, user.id);
  }
}
