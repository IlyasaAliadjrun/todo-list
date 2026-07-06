import { z } from "zod";

/** Batas upload (dipakai server & bisa dipakai klien untuk validasi awal). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_UPLOAD_PREFIX = "image/"; // Fase 3: gambar saja

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
