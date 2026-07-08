import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  normalizeCellValue,
  type CreatePropertyInput,
  type Database as DatabaseDto,
  type DatabaseProperty as PropertyDto,
  type PermissionLevel,
  type SelectOption,
  type UpdateDatabaseViewInput,
  type UpdatePropertyInput,
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
      viewType: db.viewType,
      groupByPropertyId: db.groupByPropertyId,
      datePropertyId: db.datePropertyId,
      coverPropertyId: db.coverPropertyId,
      properties,
      rows: db.rows.map((r) => ({ id: r.id, databaseId: r.databaseId, order: r.order })),
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

  /** Ubah view aktif + properti konfigurasinya (butuh EDIT). Referensi divalidasi. */
  async updateView(
    id: string,
    userId: string,
    input: UpdateDatabaseViewInput,
  ): Promise<DatabaseDto> {
    await this.ownedDatabase(id, userId);
    const props = await this.prisma.databaseProperty.findMany({
      where: { databaseId: id },
      select: { id: true, type: true },
    });

    // Validasi soft-ref: id (bila non-null) harus milik database & bertipe sesuai.
    const requireProp = (propId: string | null | undefined, type: PropertyDto["type"], label: string) => {
      if (propId == null) return;
      const p = props.find((x) => x.id === propId);
      if (!p) throw new BadRequestException(`Properti ${label} tidak ditemukan di database ini`);
      if (p.type !== type)
        throw new BadRequestException(`Properti ${label} harus bertipe ${type}`);
    };
    requireProp(input.groupByPropertyId, "SELECT", "group-by (Board)");
    requireProp(input.datePropertyId, "DATE", "tanggal (Calendar)");
    requireProp(input.coverPropertyId, "URL", "sampul (Gallery)");

    await this.prisma.database.update({
      where: { id },
      data: {
        ...(input.viewType !== undefined ? { viewType: input.viewType } : {}),
        ...(input.groupByPropertyId !== undefined
          ? { groupByPropertyId: input.groupByPropertyId }
          : {}),
        ...(input.datePropertyId !== undefined ? { datePropertyId: input.datePropertyId } : {}),
        ...(input.coverPropertyId !== undefined ? { coverPropertyId: input.coverPropertyId } : {}),
      },
    });
    return this.loadFull(id);
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

    await this.prisma.cellValue.upsert({
      where: { rowId_propertyId: { rowId, propertyId } },
      create: { rowId, propertyId, value: toJson(value) },
      update: { value: toJson(value) },
    });
    return this.loadFull(row.databaseId);
  }
}
