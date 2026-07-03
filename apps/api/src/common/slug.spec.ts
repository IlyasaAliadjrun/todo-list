import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("menormalkan teks jadi slug URL-safe", () => {
    expect(slugify("Tim Produk Keren!")).toBe("tim-produk-keren");
    expect(slugify("  Halo   Dunia  ")).toBe("halo-dunia");
  });

  it("membuang karakter non-alfanumerik di tepi", () => {
    expect(slugify("---Test---")).toBe("test");
  });
});

describe("uniqueSlug", () => {
  it("menambahkan suffix acak sehingga dua panggilan berbeda", () => {
    const a = uniqueSlug("Workspace Saya");
    const b = uniqueSlug("Workspace Saya");
    expect(a).not.toBe(b);
    expect(a.startsWith("workspace-saya-")).toBe(true);
  });

  it("punya fallback bila input kosong", () => {
    expect(uniqueSlug("!!!").startsWith("workspace-")).toBe(true);
  });
});
