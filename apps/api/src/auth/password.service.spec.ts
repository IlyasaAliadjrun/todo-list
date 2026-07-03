import { describe, expect, it } from "vitest";
import { PasswordService } from "./password.service";

describe("PasswordService (argon2)", () => {
  const service = new PasswordService();

  it("meng-hash lalu memverifikasi password yang benar", async () => {
    const hash = await service.hash("s3cretpass");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await service.verify(hash, "s3cretpass")).toBe(true);
  });

  it("menolak password yang salah", async () => {
    const hash = await service.hash("s3cretpass");
    expect(await service.verify(hash, "salah")).toBe(false);
  });

  it("mengembalikan false untuk hash yang tidak valid", async () => {
    expect(await service.verify("bukan-hash", "apa saja")).toBe(false);
  });
});
