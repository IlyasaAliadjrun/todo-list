import { PresignUploadResponseSchema, type PresignUploadInput } from "@notion/shared";
import { apiFetch } from "@/lib/http";

function presignUpload(input: PresignUploadInput) {
  return apiFetch(
    "/uploads/presign",
    { method: "POST", body: JSON.stringify(input) },
    PresignUploadResponseSchema,
  );
}

/**
 * Upload file gambar: minta presigned URL ke API, PUT langsung ke object storage,
 * kembalikan URL publik. Dipakai oleh BlockNote (`uploadFile`).
 */
export async function uploadFile(file: File): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const { uploadUrl, publicUrl } = await presignUpload({
    filename: file.name,
    contentType,
    size: file.size,
  });

  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) throw new Error(`Gagal mengunggah gambar (HTTP ${res.status})`);

  return publicUrl;
}
