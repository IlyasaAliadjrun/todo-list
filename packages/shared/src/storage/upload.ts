import { z } from "zod";

/** Batas upload (dipakai server & bisa dipakai klien untuk validasi awal). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
/** Tipe konten yang diizinkan: gambar + dokumen/arsip umum (lampiran record). */
export const ALLOWED_UPLOAD_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "text/",
  "application/pdf",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd", // Office (OpenXML, ms-excel, ms-powerpoint, dll.)
  "application/octet-stream",
] as const;

export function isAllowedUploadType(contentType: string): boolean {
  return ALLOWED_UPLOAD_PREFIXES.some((p) => contentType.startsWith(p));
}

/** Lampiran record (disimpan di DatabaseRow.attachments). */
export const RowAttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  size: z.number().int().nonnegative(),
});
export type RowAttachment = z.infer<typeof RowAttachmentSchema>;
export const RowAttachmentsSchema = z.object({ attachments: z.array(RowAttachmentSchema) });
export type RowAttachments = z.infer<typeof RowAttachmentsSchema>;

export const PresignUploadInputSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});
export type PresignUploadInput = z.infer<typeof PresignUploadInputSchema>;

/** `uploadUrl` = presigned PUT (browser upload langsung), `publicUrl` = URL baca. */
export const PresignUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  key: z.string(),
});
export type PresignUploadResponse = z.infer<typeof PresignUploadResponseSchema>;
