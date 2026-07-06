import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WorkspaceRole } from "@notion/db";
import type {
  CreateWorkspaceInput,
  Invitation,
  InviteMemberInput,
  UpdateMemberRoleInput,
  WorkspaceMember,
  WorkspaceSummary,
} from "@notion/shared";
import { MailService } from "../mail/mail.service";
import { createHash, randomBytes } from "node:crypto";
import { uniqueSlug } from "../common/slug";
import { PrismaService } from "../prisma/prisma.service";

const ROLE_RANK: Record<WorkspaceRole, number> = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  /** Pastikan user anggota workspace dengan role minimal tertentu. */
  private async requireRole(
    workspaceId: string,
    userId: string,
    minRole: WorkspaceRole,
  ): Promise<{ role: WorkspaceRole }> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw new NotFoundException("Workspace tidak ditemukan");
    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException("Akses ditolak untuk aksi ini");
    }
    return membership;
  }

  async listMine(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      type: m.workspace.type,
      role: m.role,
    }));
  }

  async createTeam(userId: string, input: CreateWorkspaceInput): Promise<WorkspaceSummary> {
    const workspace = await this.prisma.workspace.create({
      data: {
        name: input.name,
        slug: uniqueSlug(input.name),
        type: "TEAM",
        members: { create: { userId, role: "OWNER" } },
      },
    });
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      type: workspace.type,
      role: "OWNER",
    };
  }

  async listMembers(workspaceId: string, userId: string): Promise<WorkspaceMember[]> {
    await this.requireRole(workspaceId, userId, "MEMBER");
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    return members.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    }));
  }

  async invite(
    workspaceId: string,
    actorId: string,
    input: InviteMemberInput,
  ): Promise<Invitation> {
    await this.requireRole(workspaceId, actorId, "ADMIN");

    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, user: { email: input.email } },
    });
    if (existingMember) throw new ConflictException("User sudah menjadi anggota workspace");

    const rawToken = randomBytes(24).toString("hex");
    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email: input.email,
        role: input.role,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        invitedById: actorId,
      },
    });

    // Kirim email undangan (best-effort). Token tetap dikembalikan sebagai fallback.
    const [workspace, inviter] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      this.prisma.user.findUnique({ where: { id: actorId }, select: { name: true, email: true } }),
    ]);
    const emailSent = await this.mail.sendWorkspaceInvite({
      to: input.email,
      workspaceName: workspace?.name ?? "workspace",
      inviterName: inviter?.name || inviter?.email || "Seseorang",
      token: rawToken,
    });

    return {
      id: invitation.id,
      workspaceId: invitation.workspaceId,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
      token: rawToken, // fallback bila email nonaktif
      emailSent,
    };
  }

  async acceptInvitation(
    userId: string,
    userEmail: string,
    rawToken: string,
  ): Promise<WorkspaceSummary> {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new BadRequestException("Undangan tidak valid atau sudah kedaluwarsa");
    }
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException("Undangan ini ditujukan untuk email lain");
    }

    const workspace = await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
        create: { workspaceId: invitation.workspaceId, userId, role: invitation.role },
        update: {},
      });
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return tx.workspace.findUniqueOrThrow({ where: { id: invitation.workspaceId } });
    });

    const membership = await this.prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
    });
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      type: workspace.type,
      role: membership.role,
    };
  }

  async updateMemberRole(
    workspaceId: string,
    actorId: string,
    targetUserId: string,
    input: UpdateMemberRoleInput,
  ): Promise<WorkspaceMember> {
    await this.requireRole(workspaceId, actorId, "ADMIN");
    const target = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      include: { user: true },
    });
    if (!target) throw new NotFoundException("Anggota tidak ditemukan");
    if (target.role === "OWNER") throw new ForbiddenException("Role OWNER tidak dapat diubah");

    const updated = await this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role: input.role },
      include: { user: true },
    });
    return {
      userId: updated.userId,
      email: updated.user.email,
      name: updated.user.name,
      role: updated.role,
      joinedAt: updated.createdAt.toISOString(),
    };
  }

  async removeMember(workspaceId: string, actorId: string, targetUserId: string): Promise<void> {
    await this.requireRole(workspaceId, actorId, "ADMIN");
    const target = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException("Anggota tidak ditemukan");
    if (target.role === "OWNER") throw new ForbiddenException("OWNER tidak dapat dihapus");

    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
  }
}
