import { z } from "zod";
import { PermissionLevelSchema } from "../permission/permission";

/** Satu halaman (flat, tanpa children) — dipakai untuk detail & list. */
export const PageSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  parentId: z.string().nullable(),
  title: z.string(),
  icon: z.string().nullable(),
  coverUrl: z.string().nullable(),
  order: z.string(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Page = z.infer<typeof PageSchema>;

/** Konten dokumen BlockNote (array block). jsonb longgar — divalidasi oleh editor. */
export const PageContentSchema = z.array(z.unknown());
export type PageContent = z.infer<typeof PageContentSchema>;

/** Detail halaman = Page + konten + level akses user saat ini. */
export const PageDetailSchema = PageSchema.extend({
  content: PageContentSchema.nullable(),
  myLevel: PermissionLevelSchema,
});
export type PageDetail = z.infer<typeof PageDetailSchema>;

/** Body autosave konten. Last-write-wins (real-time via Yjs di Fase 5). */
export const UpdatePageContentInputSchema = z.object({
  content: PageContentSchema,
});
export type UpdatePageContentInput = z.infer<typeof UpdatePageContentInputSchema>;

/** Node tree bersarang untuk sidebar (rekursif). */
export type PageTreeNode = Page & { children: PageTreeNode[] };
export const PageTreeNodeSchema: z.ZodType<PageTreeNode> = z.lazy(() =>
  PageSchema.extend({ children: z.array(PageTreeNodeSchema) }),
);

export const CreatePageInputSchema = z.object({
  parentId: z.string().nullable().optional(),
  title: z.string().trim().max(200).optional(),
  icon: z.string().max(20).optional(),
});
export type CreatePageInput = z.infer<typeof CreatePageInputSchema>;

export const UpdatePageInputSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    icon: z.string().max(20).nullable().optional(),
    coverUrl: z.string().url().max(2048).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Tidak ada perubahan" });
export type UpdatePageInput = z.infer<typeof UpdatePageInputSchema>;

/**
 * Pindah halaman: ganti parent + posisi antar-saudara. `afterId` = id sibling
 * yang harus berada TEPAT SEBELUM halaman ini (null/undefined = jadi item pertama).
 */
export const MovePageInputSchema = z.object({
  parentId: z.string().nullable(),
  afterId: z.string().nullable().optional(),
});
export type MovePageInput = z.infer<typeof MovePageInputSchema>;
