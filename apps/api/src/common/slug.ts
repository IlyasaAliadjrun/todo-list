import { randomBytes } from "node:crypto";

/** Ubah teks jadi slug URL-safe. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Slug + suffix acak agar unik secara global (Workspace.slug @unique). */
export function uniqueSlug(input: string): string {
  const base = slugify(input) || "workspace";
  return `${base}-${randomBytes(3).toString("hex")}`;
}
