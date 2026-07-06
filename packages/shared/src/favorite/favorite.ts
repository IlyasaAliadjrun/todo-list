import { z } from "zod";

/** Halaman ringkas untuk daftar favorit di sidebar. */
export const FavoritePageSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
});
export type FavoritePage = z.infer<typeof FavoritePageSchema>;

/** Respons toggle favorit. */
export const FavoriteStatusSchema = z.object({ favorited: z.boolean() });
export type FavoriteStatus = z.infer<typeof FavoriteStatusSchema>;
