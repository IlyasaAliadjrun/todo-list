import { describe, expect, it, vi } from "vitest";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("http://localhost:9000/notion-uploads/signed-put"),
}));

// Env minimal agar loadEnv() lolos saat StorageService dikonstruksi.
process.env.DATABASE_URL ??= "postgresql://notion:notion@localhost:5432/notion";
process.env.JWT_ACCESS_SECRET ??= "0123456789abcdef0123456789abcdef";
process.env.S3_ACCESS_KEY ??= "minioadmin";
process.env.S3_SECRET_KEY ??= "minioadmin";
process.env.S3_ENDPOINT ??= "http://localhost:9000";
process.env.S3_BUCKET ??= "notion-uploads";

const { StorageService } = await import("./storage.service");

describe("StorageService.presignUpload", () => {
  const svc = new StorageService();

  it("menolak tipe file yang tidak diizinkan", async () => {
    await expect(
      svc.presignUpload({ filename: "a.sh", contentType: "application/x-sh", size: 100 }),
    ).rejects.toThrow(/tidak diperbolehkan/i);
  });

  it("mengizinkan lampiran non-gambar (pdf)", async () => {
    const res = await svc.presignUpload({
      filename: "dok.pdf",
      contentType: "application/pdf",
      size: 2048,
    });
    expect(res.key).toMatch(/^uploads\/[\w-]+\.pdf$/);
  });

  it("menolak file melebihi 10MB", async () => {
    await expect(
      svc.presignUpload({ filename: "a.png", contentType: "image/png", size: 11 * 1024 * 1024 }),
    ).rejects.toThrow(/10MB/);
  });

  it("mengembalikan uploadUrl, publicUrl, key untuk gambar valid", async () => {
    const res = await svc.presignUpload({
      filename: "foto.PNG",
      contentType: "image/png",
      size: 2048,
    });
    expect(res.uploadUrl).toMatch(/^http/);
    expect(res.key).toMatch(/^uploads\/[\w-]+\.png$/);
    expect(res.publicUrl).toContain("/notion-uploads/uploads/");
  });
});
