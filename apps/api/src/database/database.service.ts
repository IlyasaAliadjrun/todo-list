import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  normalizeCellValue,
  type CreatePropertyInput,
  type Database as DatabaseDto,
  type DatabaseProperty as PropertyDto,
  type PermissionLevel,
  type SelectOption,
  type CreateViewInput,
  type UpdatePropertyInput,
  type UpdateRowInput,
  type UpdateViewInput,
} from "@notion/shared";
import { Prisma } from "@notion/db";
import { generateKeyBetween } from "fractional-indexing";
import { PermissionService } from "../permission/permission.service";
import { PrismaService } from "../prisma/prisma.service";

type OrderedRef = { id: string; order: string };

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

@Injectable()
export class DatabaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  /** Akses database mengikuti akses halaman tempatnya (via permission per-page). */
  private async requireDbLevel(
    db: { pageId: string | null; workspaceId: string },
    userId: string,
    min: PermissionLevel,
  ): Promise<void> {
    if (db.pageId) {
      await this.permissions.requireLevel(db.pageId, userId, min);
      return;
    }
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: db.workspaceId, userId } },
    });
    if (!membership) throw new NotFoundException("Database tidak ditemukan");
  }

  private async ownedDatabase(id: string, userId: string, min: PermissionLevel = "EDIT") {
    const db = await this.prisma.database.findUnique({ where: { id } });
    if (!db) throw new NotFoundException("Database tidak ditemukan");
    await this.requireDbLevel(db, userId, min);
    return db;
  }

  private async ownedProperty(id: string, userId: string, min: PermissionLevel = "EDIT") {
    const prop = await this.prisma.databaseProperty.findUnique({
      where: { id },
      include: { database: true },
    });
    if (!prop) throw new NotFoundException("Kolom tidak ditemukan");
    await this.requireDbLevel(prop.database, userId, min);
    return prop;
  }

  private async ownedRow(id: string, userId: string, min: PermissionLevel = "EDIT") {
    const row = await this.prisma.databaseRow.findUnique({
      where: { id },
      include: { database: true },
    });
    if (!row) throw new NotFoundException("Baris tidak ditemukan");
    await this.requireDbLevel(row.database, userId, min);
    return row;
  }

  private optionsOf(raw: Prisma.JsonValue | null): SelectOption[] {
    return Array.isArray(raw) ? (raw as unknown as SelectOption[]) : [];
  }

  private computeOrder(siblings: OrderedRef[], afterId: string | null): string {
    if (!afterId) return generateKeyBetween(null, siblings[0]?.order ?? null);
    const idx = siblings.findIndex((s) => s.id === afterId);
    if (idx < 0) return generateKeyBetween(siblings[siblings.length - 1]?.order ?? null, null);
    return generateKeyBetween(siblings[idx].order, siblings[idx + 1]?.order ?? null);
  }

  private async loadFull(id: string): Promise<DatabaseDto> {
    const db = await this.prisma.database.findUniqueOrThrow({
      where: { id },
      include: {
        properties: { orderBy: { order: "asc" } },
        rows: { orderBy: { order: "asc" }, include: { cells: true } },
        views: { orderBy: { order: "asc" } },
      },
    });

    const properties: PropertyDto[] = db.properties.map((p) => ({
      id: p.id,
      databaseId: p.databaseId,
      name: p.name,
      type: p.type,
      options: this.optionsOf(p.options),
      order: p.order,
    }));

    const cells = db.rows.flatMap((r) =>
      r.cells.map((c) => ({ rowId: c.rowId, propertyId: c.propertyId, value: c.value ?? null })),
    );

    return {
      id: db.id,
      workspaceId: db.workspaceId,
      pageId: db.pageId,
      title: db.title,
      views: db.views.map((v) => ({
        id: v.id,
        databaseId: v.databaseId,
        name: v.name,
        type: v.type,
        groupByPropertyId: v.groupByPropertyId,
        order: v.order,
      })),
      activeViewId: db.activeViewId,
      properties,
      rows: db.rows.map((r) => ({
        id: r.id,
        databaseId: r.databaseId,
        order: r.order,
        icon: r.icon,
      })),
      cells,
    };
  }

  async create(userId: string, input: { pageId?: string; title?: string }): Promise<DatabaseDto> {
    if (!input.pageId) throw new BadRequestException("pageId wajib untuk membuat database");
    const page = await this.prisma.page.findUnique({ where: { id: input.pageId } });
    if (!page) throw new NotFoundException("Halaman tidak ditemukan");
    await this.permissions.requireLevel(input.pageId, userId, "EDIT");

    const db = await this.prisma.$transaction(async (tx) => {
      const created = await tx.database.create({
        data: {
          workspaceId: page.workspaceId,
          pageId: page.id,
          title: input.title?.trim() || "Untitled",
        },
      });
      await tx.databaseProperty.create({
        data: {
          databaseId: created.id,
          name: "Nama",
          type: "TEXT",
          order: generateKeyBetween(null, null),
        },
      });
      await tx.databaseRow.create({
        data: { databaseId: created.id, order: generateKeyBetween(null, null) },
      });
      // Setiap database punya minimal satu tab view (default: Tabel).
      const view = await tx.databaseViewConfig.create({
        data: {
          databaseId: created.id,
          name: "Tabel",
          type: "TABLE",
          order: generateKeyBetween(null, null),
        },
      });
      await tx.database.update({ where: { id: created.id }, data: { activeViewId: view.id } });
      return created;
    });

    return this.loadFull(db.id);
  }

  async getDatabase(id: string, userId: string): Promise<DatabaseDto> {
    await this.ownedDatabase(id, userId, "VIEW");
    return this.loadFull(id);
  }

  async updateDatabase(id: string, userId: string, title: string): Promise<DatabaseDto> {
    await this.ownedDatabase(id, userId);
    await this.prisma.database.update({ where: { id }, data: { title: title.trim() } });
    return this.loadFull(id);
  }

  private async ownedView(id: string, userId: string, min: PermissionLevel = "EDIT") {
    const view = await this.prisma.databaseViewConfig.findUnique({
      where: { id },
      include: { database: true },
    });
    if (!view) throw new NotFoundException("View tidak ditemukan");
    await this.requireDbLevel(view.database, userId, min);
    return view;
  }

  /** Validasi group-by: properti harus milik database & bertipe SELECT. */
  private async assertGroupBy(databaseId: string, propId: string | null | undefined): Promise<void> {
    if (propId == null) return;
    const p = await this.prisma.databaseProperty.findUnique({ where: { id: propId } });
    if (!p || p.databaseId !== databaseId) {
      throw new BadRequestException("Properti group-by tidak ditemukan di database ini");
    }
    if (p.type !== "SELECT") throw new BadRequestException("Properti group-by harus bertipe SELECT");
  }

  /** Tambah tab view baru (butuh EDIT) dan jadikan aktif. */
  async createView(
    databaseId: string,
    userId: string,
    input: CreateViewInput,
  ): Promise<DatabaseDto> {
    await this.ownedDatabase(databaseId, userId);
    const last = await this.prisma.databaseViewConfig.findFirst({
      where: { databaseId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const created = await this.prisma.databaseViewConfig.create({
      data: {
        databaseId,
        name: input.name?.trim() || (input.type === "BOARD" ? "Board" : "Tabel"),
        type: input.type ?? "TABLE",
        order: generateKeyBetween(last?.order ?? null, null),
      },
    });
    await this.prisma.database.update({
      where: { id: databaseId },
      data: { activeViewId: created.id },
    });
    return this.loadFull(databaseId);
  }

  /** Ubah satu tab view: nama/tipe/group-by (butuh EDIT). */
  async updateView(id: string, userId: string, input: UpdateViewInput): Promise<DatabaseDto> {
    const view = await this.ownedView(id, userId);
    await this.assertGroupBy(view.databaseId, input.groupByPropertyId);
    await this.prisma.databaseViewConfig.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.groupByPropertyId !== undefined
          ? { groupByPropertyId: input.groupByPropertyId }
          : {}),
      },
    });
    return this.loadFull(view.databaseId);
  }

  /** Hapus tab view (butuh EDIT). Minimal satu view harus tersisa. */
  async deleteView(id: string, userId: string): Promise<DatabaseDto> {
    const view = await this.ownedView(id, userId);
    const count = await this.prisma.databaseViewConfig.count({
      where: { databaseId: view.databaseId },
    });
    if (count <= 1) throw new BadRequestException("Minimal satu view harus ada");

    await this.prisma.databaseViewConfig.delete({ where: { id } });
    // Bila view aktif dihapus → pilih view pertama yang tersisa.
    const db = await this.prisma.database.findUniqueOrThrow({ where: { id: view.databaseId } });
    if (db.activeViewId === id) {
      const first = await this.prisma.databaseViewConfig.findFirst({
        where: { databaseId: view.databaseId },
        orderBy: { order: "asc" },
      });
      await this.prisma.database.update({
        where: { id: view.databaseId },
        data: { activeViewId: first?.id ?? null },
      });
    }
    return this.loadFull(view.databaseId);
  }

  /** Pilih tab view aktif (butuh EDIT). */
  async setActiveView(databaseId: string, userId: string, viewId: string): Promise<DatabaseDto> {
    await this.ownedDatabase(databaseId, userId);
    const view = await this.prisma.databaseViewConfig.findUnique({ where: { id: viewId } });
    if (!view || view.databaseId !== databaseId) {
      throw new BadRequestException("View tidak ditemukan di database ini");
    }
    await this.prisma.database.update({ where: { id: databaseId }, data: { activeViewId: viewId } });
    return this.loadFull(databaseId);
  }

  async deleteDatabase(id: string, userId: string): Promise<void> {
    await this.ownedDatabase(id, userId);
    await this.prisma.database.delete({ where: { id } });
  }

  async addProperty(
    databaseId: string,
    userId: string,
    input: CreatePropertyInput,
  ): Promise<DatabaseDto> {
    await this.ownedDatabase(databaseId, userId);
    const last = await this.prisma.databaseProperty.findFirst({
      where: { databaseId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    await this.prisma.databaseProperty.create({
      data: {
        databaseId,
        name: input.name?.trim() || "Kolom",
        type: input.type ?? "TEXT",
        options: [],
        order: generateKeyBetween(last?.order ?? null, null),
      },
    });
    return this.loadFull(databaseId);
  }

  async updateProperty(
    id: string,
    userId: string,
    input: UpdatePropertyInput,
  ): Promise<DatabaseDto> {
    const prop = await this.ownedProperty(id, userId);
    const nextType = input.type ?? prop.type;
    const nextOptions = input.options ?? this.optionsOf(prop.options);

    await this.prisma.$transaction(async (tx) => {
      await tx.databaseProperty.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.options !== undefined ? { options: input.options } : {}),
        },
      });

      // Ganti tipe / opsi → normalisasi ulang nilai sel (best-effort; gagal → kosong).
      if (input.type !== undefined || input.options !== undefined) {
        const cells = await tx.cellValue.findMany({ where: { propertyId: id } });
        for (const c of cells) {
          let value: unknown = null;
          try {
            value = normalizeCellValue(nextType, nextOptions, c.value);
          } catch {
            value = null;
          }
          await tx.cellValue.update({ where: { id: c.id }, data: { value: toJson(value) } });
        }
      }
    });

    return this.loadFull(prop.databaseId);
  }

  async deleteProperty(id: string, userId: string): Promise<DatabaseDto> {
    const prop = await this.ownedProperty(id, userId);
    await this.prisma.databaseProperty.delete({ where: { id } });
    return this.loadFull(prop.databaseId);
  }

  async moveProperty(id: string, userId: string, afterId: string | null): Promise<DatabaseDto> {
    const prop = await this.ownedProperty(id, userId);
    const siblings = await this.prisma.databaseProperty.findMany({
      where: { databaseId: prop.databaseId, NOT: { id } },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
    await this.prisma.databaseProperty.update({
      where: { id },
      data: { order: this.computeOrder(siblings, afterId) },
    });
    return this.loadFull(prop.databaseId);
  }

  async addRow(databaseId: string, userId: string): Promise<DatabaseDto> {
    await this.ownedDatabase(databaseId, userId);
    const last = await this.prisma.databaseRow.findFirst({
      where: { databaseId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    await this.prisma.databaseRow.create({
      data: { databaseId, order: generateKeyBetween(last?.order ?? null, null) },
    });
    return this.loadFull(databaseId);
  }

  /** Ubah atribut record (ikon) — butuh EDIT. */
  async updateRow(id: string, userId: string, input: UpdateRowInput): Promise<DatabaseDto> {
    const row = await this.ownedRow(id, userId, "EDIT");
    await this.prisma.databaseRow.update({
      where: { id },
      data: { ...(input.icon !== undefined ? { icon: input.icon || null } : {}) },
    });
    return this.loadFull(row.databaseId);
  }

  /** Ambil konten/catatan record (≥VIEW). */
  async getRowContent(id: string, userId: string): Promise<{ content: unknown }> {
    const row = await this.ownedRow(id, userId, "VIEW");
    const full = await this.prisma.databaseRow.findUniqueOrThrow({
      where: { id: row.id },
      select: { content: true },
    });
    return { content: full.content ?? null };
  }

  /** Simpan konten/catatan record (≥EDIT). */
  async setRowContent(id: string, userId: string, content: unknown): Promise<void> {
    await this.ownedRow(id, userId, "EDIT");
    await this.prisma.databaseRow.update({ where: { id }, data: { content: toJson(content) } });
  }

  /** Ambil lampiran record (≥VIEW). */
  async getRowAttachments(id: string, userId: string): Promise<{ attachments: unknown }> {
    const row = await this.ownedRow(id, userId, "VIEW");
    const full = await this.prisma.databaseRow.findUniqueOrThrow({
      where: { id: row.id },
      select: { attachments: true },
    });
    return { attachments: full.attachments ?? [] };
  }

  /** Simpan lampiran record (≥EDIT). */
  async setRowAttachments(id: string, userId: string, attachments: unknown): Promise<void> {
    await this.ownedRow(id, userId, "EDIT");
    await this.prisma.databaseRow.update({
      where: { id },
      data: { attachments: toJson(attachments) },
    });
  }

  async deleteRow(id: string, userId: string): Promise<DatabaseDto> {
    const row = await this.ownedRow(id, userId);
    await this.prisma.databaseRow.delete({ where: { id } });
    return this.loadFull(row.databaseId);
  }

  async moveRow(id: string, userId: string, afterId: string | null): Promise<DatabaseDto> {
    const row = await this.ownedRow(id, userId);
    const siblings = await this.prisma.databaseRow.findMany({
      where: { databaseId: row.databaseId, NOT: { id } },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
    await this.prisma.databaseRow.update({
      where: { id },
      data: { order: this.computeOrder(siblings, afterId) },
    });
    return this.loadFull(row.databaseId);
  }

  async setCell(
    rowId: string,
    propertyId: string,
    userId: string,
    rawValue: unknown,
  ): Promise<DatabaseDto> {
    const row = await this.ownedRow(rowId, userId);
    const prop = await this.prisma.databaseProperty.findUnique({ where: { id: propertyId } });
    if (!prop || prop.databaseId !== row.databaseId) {
      throw new BadRequestException("Kolom tidak valid untuk baris ini");
    }

    let value: unknown;
    try {
      value = normalizeCellValue(prop.type, this.optionsOf(prop.options), rawValue);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "Nilai tidak valid");
    }

    // PERSON: pastikan setiap userId benar-benar anggota workspace database ini.
    if (prop.type === "PERSON") {
      const ids = value as string[];
      if (ids.length > 0) {
        const db = await this.prisma.database.findUniqueOrThrow({
          where: { id: row.databaseId },
          select: { workspaceId: true },
        });
        const members = await this.prisma.workspaceMember.findMany({
          where: { workspaceId: db.workspaceId, userId: { in: ids } },
          select: { userId: true },
        });
        if (members.length !== ids.length) {
          throw new BadRequestException("Ada user yang bukan anggota workspace ini");
        }
      }
    }

    await this.prisma.cellValue.upsert({
      where: { rowId_propertyId: { rowId, propertyId } },
      create: { rowId, propertyId, value: toJson(value) },
      update: { value: toJson(value) },
    });
    return this.loadFull(row.databaseId);
  }
}
