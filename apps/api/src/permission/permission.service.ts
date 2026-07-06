import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  levelAtLeast,
  resolveEffectiveLevel,
  type PagePermissionEntry,
  type PagePermissionsResponse,
  type PermissionGrant,
  type PermissionLevel,
  type SetPagePermissionInput,
  type WorkspaceRole,
} from "@notion/shared";
import { PrismaService } from "../prisma/prisma.service";

/** Resolver level per-halaman untuk satu workspace (in-memory, hemat query). */
export type LevelResolver = (pageId: string) => PermissionLevel | null;

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  private async roleOf(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  /** Level efektif user untuk sebuah halaman (null = tanpa akses). */
  async getEffectiveLevel(pageId: string, userId: string): Promise<PermissionLevel | null> {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true, parentId: true, workspaceId: true },
    });
    if (!page) return null;
    const role = await this.roleOf(page.workspaceId, userId);
    if (!role) return null;

    // Rantai ancestor (halaman → root).
    const chainIds: string[] = [];
    const seen = new Set<string>();
    let cursor: { id: string; parentId: string | null } | null = {
      id: page.id,
      parentId: page.parentId,
    };
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      chainIds.push(cursor.id);
      if (!cursor.parentId) break;
      cursor = await this.prisma.page.findUnique({
        where: { id: cursor.parentId },
        select: { id: true, parentId: true },
      });
    }

    const perms = await this.prisma.pagePermission.findMany({
      where: { pageId: { in: chainIds } },
      select: { pageId: true, subjectType: true, subjectId: true, level: true },
    });
    const byPage = new Map<string, PermissionGrant[]>();
    for (const p of perms) {
      const arr = byPage.get(p.pageId) ?? [];
      arr.push({ subjectType: p.subjectType, subjectId: p.subjectId, level: p.level });
      byPage.set(p.pageId, arr);
    }
    const chain = chainIds.map((id) => ({ permissions: byPage.get(id) ?? [] }));
    return resolveEffectiveLevel({ userId, role, chain });
  }

  /** Lempar bila level < min. 404 bila di bawah VIEW (menyembunyikan keberadaan). */
  async requireLevel(
    pageId: string,
    userId: string,
    min: PermissionLevel,
  ): Promise<PermissionLevel> {
    const level = await this.getEffectiveLevel(pageId, userId);
    if (!levelAtLeast(level, "VIEW")) throw new NotFoundException("Halaman tidak ditemukan");
    if (!levelAtLeast(level, min)) throw new ForbiddenException("Akses tidak mencukupi");
    return level as PermissionLevel;
  }

  /** Resolver in-memory untuk SEMUA halaman workspace (dipakai filter tree). */
  async buildResolver(workspaceId: string, userId: string): Promise<LevelResolver | null> {
    const role = await this.roleOf(workspaceId, userId);
    if (!role) return null;

    const pages = await this.prisma.page.findMany({
      where: { workspaceId },
      select: { id: true, parentId: true },
    });
    const parentOf = new Map(pages.map((p) => [p.id, p.parentId]));

    const perms = await this.prisma.pagePermission.findMany({
      where: { page: { workspaceId } },
      select: { pageId: true, subjectType: true, subjectId: true, level: true },
    });
    const byPage = new Map<string, PermissionGrant[]>();
    for (const p of perms) {
      const arr = byPage.get(p.pageId) ?? [];
      arr.push({ subjectType: p.subjectType, subjectId: p.subjectId, level: p.level });
      byPage.set(p.pageId, arr);
    }

    return (pageId: string): PermissionLevel | null => {
      const chain: { permissions: PermissionGrant[] }[] = [];
      const seen = new Set<string>();
      let cur: string | null = pageId;
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        chain.push({ permissions: byPage.get(cur) ?? [] });
        cur = parentOf.get(cur) ?? null;
      }
      return resolveEffectiveLevel({ userId, role, chain });
    };
  }

  async listForPage(pageId: string, userId: string): Promise<PagePermissionsResponse> {
    const myLevel = await this.requireLevel(pageId, userId, "VIEW");
    const rows = await this.prisma.pagePermission.findMany({
      where: { pageId },
      orderBy: { createdAt: "asc" },
    });

    const userIds = rows.filter((r) => r.subjectType === "USER").map((r) => r.subjectId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });
    const userLabel = new Map(users.map((u) => [u.id, u.name || u.email]));

    const permissions: PagePermissionEntry[] = rows.map((r) => ({
      id: r.id,
      subjectType: r.subjectType,
      subjectId: r.subjectId,
      level: r.level,
      label:
        r.subjectType === "WORKSPACE"
          ? "Semua anggota workspace"
          : (userLabel.get(r.subjectId) ?? r.subjectId),
    }));

    return { myLevel, canManage: myLevel === "EDIT", permissions };
  }

  async setForPage(
    pageId: string,
    userId: string,
    input: SetPagePermissionInput,
  ): Promise<PagePermissionsResponse> {
    await this.requireLevel(pageId, userId, "EDIT");
    const page = await this.prisma.page.findUniqueOrThrow({
      where: { id: pageId },
      select: { workspaceId: true },
    });

    let subjectId: string;
    if (input.subjectType === "WORKSPACE") {
      subjectId = page.workspaceId;
    } else {
      // Ubah level: pakai subjectId (userId). Tambah baru: resolusi dari email.
      let targetUserId = input.subjectId;
      if (!targetUserId) {
        if (!input.email) throw new BadRequestException("Email wajib untuk berbagi ke user");
        const target = await this.prisma.user.findUnique({
          where: { email: input.email },
          select: { id: true },
        });
        if (!target) throw new BadRequestException("Pengguna tidak ditemukan");
        targetUserId = target.id;
      }
      const member = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: page.workspaceId, userId: targetUserId } },
      });
      if (!member) throw new BadRequestException("Pengguna bukan anggota workspace ini");
      subjectId = targetUserId;
    }

    await this.prisma.pagePermission.upsert({
      where: {
        pageId_subjectType_subjectId: { pageId, subjectType: input.subjectType, subjectId },
      },
      create: { pageId, subjectType: input.subjectType, subjectId, level: input.level },
      update: { level: input.level },
    });
    return this.listForPage(pageId, userId);
  }

  async removeForPage(
    pageId: string,
    permissionId: string,
    userId: string,
  ): Promise<PagePermissionsResponse> {
    await this.requireLevel(pageId, userId, "EDIT");
    const perm = await this.prisma.pagePermission.findUnique({ where: { id: permissionId } });
    if (!perm || perm.pageId !== pageId) throw new NotFoundException("Permission tidak ditemukan");
    await this.prisma.pagePermission.delete({ where: { id: permissionId } });
    return this.listForPage(pageId, userId);
  }
}
