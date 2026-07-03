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
  AcceptInvitationInputSchema,
  CreateWorkspaceInputSchema,
  InviteMemberInputSchema,
  UpdateMemberRoleInputSchema,
  type Invitation,
  type WorkspaceMember,
  type WorkspaceSummary,
} from "@notion/shared";
import type { AuthenticatedUser } from "../auth/auth.constants";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { WorkspaceService } from "./workspace.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspace: WorkspaceService) {}

  @Get("workspaces")
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<WorkspaceSummary[]> {
    return this.workspace.listMine(user.id);
  }

  @Post("workspaces")
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateWorkspaceInputSchema))
    dto: import("@notion/shared").CreateWorkspaceInput,
  ): Promise<WorkspaceSummary> {
    return this.workspace.createTeam(user.id, dto);
  }

  @Get("workspaces/:id/members")
  listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") workspaceId: string,
  ): Promise<WorkspaceMember[]> {
    return this.workspace.listMembers(workspaceId, user.id);
  }

  @Post("workspaces/:id/invitations")
  @HttpCode(HttpStatus.CREATED)
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") workspaceId: string,
    @Body(new ZodValidationPipe(InviteMemberInputSchema))
    dto: import("@notion/shared").InviteMemberInput,
  ): Promise<Invitation> {
    return this.workspace.invite(workspaceId, user.id, dto);
  }

  @Post("invitations/accept")
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(AcceptInvitationInputSchema))
    dto: import("@notion/shared").AcceptInvitationInput,
  ): Promise<WorkspaceSummary> {
    return this.workspace.acceptInvitation(user.id, user.email, dto.token);
  }

  @Patch("workspaces/:id/members/:userId")
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") workspaceId: string,
    @Param("userId") targetUserId: string,
    @Body(new ZodValidationPipe(UpdateMemberRoleInputSchema))
    dto: import("@notion/shared").UpdateMemberRoleInput,
  ): Promise<WorkspaceMember> {
    return this.workspace.updateMemberRole(workspaceId, user.id, targetUserId, dto);
  }

  @Delete("workspaces/:id/members/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") workspaceId: string,
    @Param("userId") targetUserId: string,
  ): Promise<void> {
    return this.workspace.removeMember(workspaceId, user.id, targetUserId);
  }
}
