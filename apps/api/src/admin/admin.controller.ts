import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminSetPasswordInputSchema, type AdminSetPasswordInput, type AdminUser } from "@notion/shared";
import { AuthenticatedUser } from "../auth/auth.constants";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdminService } from "./admin.service";
import { SuperAdminGuard } from "./super-admin.guard";

/** Semua rute butuh login DAN status superadmin (dicek ulang dari DB tiap request). */
@Controller("admin")
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("users")
  listUsers(): Promise<AdminUser[]> {
    return this.admin.listUsers();
  }

  @Post("users/:id/password")
  @HttpCode(HttpStatus.NO_CONTENT)
  setPassword(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(AdminSetPasswordInputSchema)) dto: AdminSetPasswordInput,
  ): Promise<void> {
    return this.admin.setPassword(id, dto.newPassword);
  }

  @Post("users/:id/revoke-sessions")
  revokeSessions(@Param("id") id: string): Promise<{ revoked: number }> {
    return this.admin.revokeSessions(id).then((revoked) => ({ revoked }));
  }

  @Delete("users/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.admin.deleteUser(id, user.id);
  }
}
