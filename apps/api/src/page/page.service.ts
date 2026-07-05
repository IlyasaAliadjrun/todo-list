import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreatePageInput,
  MovePageInput,
  Page as PageDto,
  PageTreeNode,
  UpdatePageInput,
} from "@notion/shared";
import type { Page as PageRow } from "@notion/db";
import { generateKeyBetween } from "fractional-indexing";
import { PrismaService } from "../prisma/prisma.service";
import { buildTree, collectSubtreeIds, wouldCreateCycle } from "./page.util";

@Injectable()
export class PageService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(page: PageRow): PageDto {
    return {
      id: page.id,
      workspaceId: page.workspaceId,
      parentId: page.parentId,
      title: page.title,
      icon: page.icon,
      coverUrl: page.coverUrl,
      order: page.order,
      isArchived: page.isArchived,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  /** Pastikan user anggota workspace; kalau bukan, sembunyikan keberadaannya (404). */
  private async requireMembership(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw new NotFoundException("Halaman tidak ditemukan");
  }

  /** Ambil page milik user (via keanggotaan workspace) atau lempar 404. */
  private async getOwnedPage(id: string, userId: string): Promise<PageRow> {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Halaman tidak ditemukan");
    await this.requireMembership(page.workspaceId, userId);
    return page;
  }

  async getTree(workspaceId: string, userId: string): Promise<PageTreeNode[]> {
    await this.requireMembership(workspaceId, userId);
    const pages = await this.prisma.page.findMany({
      where: { workspaceId, isArchived: false },
      orderBy: { order: "asc" },
    });
    return buildTree(pages.map((p) => this.toDto(p)));
  }

  async getPage(id: string, userId: string): Promise<PageDto> {
    const page = await this.getOwnedPage(id, userId);
    if (page.isArchived) throw new NotFoundException("Halaman tidak ditemukan");
    return this.toDto(page);
  }

  async create(workspaceId: string, userId: string, input: CreatePageInput): Promise<PageDto> {
    await this.requireMembership(workspaceId, userId);
    const parentId = input.parentId ?? null;

    if (parentId) {
      const parent = await this.prisma.page.findFirst({
        where: { id: parentId, workspaceId, isArchived: false },
      });
      if (!parent) throw new BadRequestException("Halaman induk tidak valid");
    }

    const last = await this.prisma.page.findFirst({
      where: { workspaceId, parentId, isArchived: false },
      orderBy: { order: "desc" },
    });
    const order = generateKeyBetween(last?.order ?? null, null);

    const page = await this.prisma.page.create({
      data: {
        workspaceId,
        parentId,
        title: input.title?.trim() || "Untitled",
        icon: input.icon ?? null,
        order,
        createdById: userId,
      },
    });
    return this.toDto(page);
  }

  async update(id: string, userId: string, input: UpdatePageInput): Promise<PageDto> {
    await this.getOwnedPage(id, userId);
    const page = await this.prisma.page.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() || "Untitled" } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
      },
    });
    return this.toDto(page);
  }

  async move(id: string, userId: string, input: MovePageInput): Promise<PageDto> {
    const page = await this.getOwnedPage(id, userId);
    const newParentId = input.parentId ?? null;

    const edges = await this.prisma.page.findMany({
      where: { workspaceId: page.workspaceId },
      select: { id: true, parentId: true },
    });

    if (newParentId) {
      const parentValid = edges.some((e) => e.id === newParentId);
      if (!parentValid) throw new BadRequestException("Halaman induk tidak valid");
      if (wouldCreateCycle(edges, id, newParentId)) {
        throw new BadRequestException("Tidak bisa memindahkan halaman ke dalam turunannya sendiri");
      }
    }

    // Sibling target (tanpa halaman ini), terurut, untuk hitung fractional order.
    const siblings = await this.prisma.page.findMany({
      where: { workspaceId: page.workspaceId, parentId: newParentId, isArchived: false, NOT: { id } },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });

    const afterId = input.afterId ?? null;
    let lower: string | null;
    let upper: string | null;
    if (!afterId) {
      lower = null;
      upper = siblings[0]?.order ?? null;
    } else {
      const idx = siblings.findIndex((s) => s.id === afterId);
      if (idx < 0) {
        // afterId bukan sibling valid → taruh di akhir.
        lower = siblings[siblings.length - 1]?.order ?? null;
        upper = null;
      } else {
        lower = siblings[idx].order;
        upper = siblings[idx + 1]?.order ?? null;
      }
    }
    const order = generateKeyBetween(lower, upper);

    const updated = await this.prisma.page.update({
      where: { id },
      data: { parentId: newParentId, order },
    });
    return this.toDto(updated);
  }

  async archive(id: string, userId: string): Promise<{ archived: number }> {
    const page = await this.getOwnedPage(id, userId);
    const edges = await this.prisma.page.findMany({
      where: { workspaceId: page.workspaceId },
      select: { id: true, parentId: true },
    });
    const ids = collectSubtreeIds(edges, id);
    const res = await this.prisma.page.updateMany({
      where: { id: { in: ids } },
      data: { isArchived: true, archivedAt: new Date() },
    });
    return { archived: res.count };
  }

  async restore(id: string, userId: string): Promise<PageDto> {
    const page = await this.getOwnedPage(id, userId);

    // Bila induk sudah tidak ada / masih di trash, lepas ke root agar tak orphan.
    let parentId = page.parentId;
    if (parentId) {
      const parent = await this.prisma.page.findUnique({ where: { id: parentId } });
      if (!parent || parent.isArchived) parentId = null;
    }

    const edges = await this.prisma.page.findMany({
      where: { workspaceId: page.workspaceId },
      select: { id: true, parentId: true },
    });
    const ids = collectSubtreeIds(edges, id);

    await this.prisma.$transaction([
      this.prisma.page.updateMany({
        where: { id: { in: ids } },
        data: { isArchived: false, archivedAt: null },
      }),
      this.prisma.page.update({ where: { id }, data: { parentId } }),
    ]);

    const restored = await this.prisma.page.findUniqueOrThrow({ where: { id } });
    return this.toDto(restored);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedPage(id, userId);
    await this.prisma.page.delete({ where: { id } }); // cascade ke turunan
  }

  async getTrash(workspaceId: string, userId: string): Promise<PageDto[]> {
    await this.requireMembership(workspaceId, userId);
    const pages = await this.prisma.page.findMany({
      where: { workspaceId, isArchived: true },
      orderBy: { archivedAt: "desc" },
    });
    return pages.map((p) => this.toDto(p));
  }
}
