import { expect, test } from "@playwright/test";

/** Alur inti: daftar → buat halaman → edit → favorit → cari (command palette). */
test("register → create page → edit → favorite → search", async ({ page }) => {
  const email = `e2e${Date.now()}@example.com`;

  // Register
  await page.goto("/register");
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click('button:has-text("Daftar")');
  await expect(page.getByText("My Notepad")).toBeVisible();

  // Create page from sidebar
  await page.locator('button[aria-label="Halaman baru"]').first().click();
  await expect(page).toHaveURL(/\/p\//);

  // Title + content
  await page.locator('input[placeholder="Untitled"]').fill("Halaman E2E");
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type("Konten uji end-to-end penandaunik12345.");
  await page.waitForTimeout(1800); // biarkan autosave (debounce) + trigger tsvector

  // Favorite
  await page.locator('button[aria-label="Tambah ke favorit"]').click();
  await expect(page.getByText("Favorit", { exact: false })).toBeVisible();

  // Search via command palette (cari lewat konten unik)
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Cari halaman atau aksi…").fill("penandaunik12345");
  await expect(page.locator("[cmdk-item]").filter({ hasText: "Halaman E2E" })).toBeVisible();
});
