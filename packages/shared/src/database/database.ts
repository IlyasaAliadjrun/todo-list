import { z } from "zod";

export const PropertyTypeSchema = z.enum([
  "TEXT",
  "NUMBER",
  "SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "DATE",
  "URL",
]);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const DatabaseViewTypeSchema = z.enum(["TABLE", "BOARD", "GALLERY", "CALENDAR"]);
export type DatabaseViewType = z.infer<typeof DatabaseViewTypeSchema>;

export const SelectOptionSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(60),
  color: z.string().max(20).optional(),
});
export type SelectOption = z.infer<typeof SelectOptionSchema>;

export const DatabasePropertySchema = z.object({
  id: z.string(),
  databaseId: z.string(),
  name: z.string(),
  type: PropertyTypeSchema,
  options: z.array(SelectOptionSchema),
  order: z.string(),
});
export type DatabaseProperty = z.infer<typeof DatabasePropertySchema>;

export const DatabaseRowSchema = z.object({
  id: z.string(),
  databaseId: z.string(),
  order: z.string(),
});
export type DatabaseRow = z.infer<typeof DatabaseRowSchema>;

export const CellValueSchema = z.object({
  rowId: z.string(),
  propertyId: z.string(),
  value: z.unknown().nullable(),
});
export type CellValue = z.infer<typeof CellValueSchema>;

/** Database lengkap (properti + baris + sel) untuk table view. */
export const DatabaseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  pageId: z.string().nullable(),
  title: z.string(),
  viewType: DatabaseViewTypeSchema,
  groupByPropertyId: z.string().nullable(),
  datePropertyId: z.string().nullable(),
  coverPropertyId: z.string().nullable(),
  properties: z.array(DatabasePropertySchema),
  rows: z.array(DatabaseRowSchema),
  cells: z.array(CellValueSchema),
});
export type Database = z.infer<typeof DatabaseSchema>;

// ---- Input ----
export const CreateDatabaseInputSchema = z.object({
  pageId: z.string().optional(),
  title: z.string().trim().max(120).optional(),
});
export type CreateDatabaseInput = z.infer<typeof CreateDatabaseInputSchema>;

export const UpdateDatabaseInputSchema = z.object({ title: z.string().trim().min(1).max(120) });
export type UpdateDatabaseInput = z.infer<typeof UpdateDatabaseInputSchema>;

/** Ubah view aktif & properti konfigurasinya. `null` = kosongkan referensi. */
export const UpdateDatabaseViewInputSchema = z
  .object({
    viewType: DatabaseViewTypeSchema.optional(),
    groupByPropertyId: z.string().nullable().optional(),
    datePropertyId: z.string().nullable().optional(),
    coverPropertyId: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Tidak ada perubahan" });
export type UpdateDatabaseViewInput = z.infer<typeof UpdateDatabaseViewInputSchema>;

export const CreatePropertyInputSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  type: PropertyTypeSchema.optional(),
});
export type CreatePropertyInput = z.infer<typeof CreatePropertyInputSchema>;

export const UpdatePropertyInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    type: PropertyTypeSchema.optional(),
    options: z.array(SelectOptionSchema).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Tidak ada perubahan" });
export type UpdatePropertyInput = z.infer<typeof UpdatePropertyInputSchema>;

export const MoveInputSchema = z.object({ afterId: z.string().nullable().optional() });
export type MoveInput = z.infer<typeof MoveInputSchema>;

export const UpdateCellInputSchema = z.object({ value: z.unknown() });
export type UpdateCellInput = z.infer<typeof UpdateCellInputSchema>;

/** Konten/catatan record (array block BlockNote), boleh null (kosong). */
export const RowContentSchema = z.object({ content: z.array(z.unknown()).nullable() });
export type RowContent = z.infer<typeof RowContentSchema>;

/**
 * Normalisasi & validasi nilai sel sesuai tipe properti (fungsi murni).
 * Melempar Error dengan pesan bila tidak valid. Dipakai server (sumber kebenaran)
 * dan bisa dipakai klien untuk feedback awal.
 */
export function normalizeCellValue(
  type: PropertyType,
  options: SelectOption[],
  raw: unknown,
): unknown {
  switch (type) {
    case "TEXT":
      return raw == null || raw === "" ? null : String(raw);
    case "NUMBER": {
      if (raw == null || raw === "") return null;
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) throw new Error("Nilai harus berupa angka");
      return n;
    }
    case "CHECKBOX":
      return raw === true || raw === "true";
    case "URL": {
      if (raw == null || raw === "") return null;
      const s = String(raw);
      if (!/^https?:\/\//i.test(s)) throw new Error("URL harus diawali http:// atau https://");
      return s;
    }
    case "DATE": {
      if (raw == null || raw === "") return null;
      const s = String(raw);
      if (Number.isNaN(Date.parse(s))) throw new Error("Tanggal tidak valid");
      return s;
    }
    case "SELECT": {
      if (raw == null || raw === "") return null;
      const id = String(raw);
      if (!options.some((o) => o.id === id)) throw new Error("Opsi tidak dikenal");
      return id;
    }
    case "MULTI_SELECT": {
      if (raw == null || raw === "") return [];
      const arr = Array.isArray(raw) ? raw : [raw];
      const ids = arr.map(String);
      for (const id of ids) {
        if (!options.some((o) => o.id === id)) throw new Error("Opsi tidak dikenal");
      }
      return ids;
    }
    default:
      return null;
  }
}
