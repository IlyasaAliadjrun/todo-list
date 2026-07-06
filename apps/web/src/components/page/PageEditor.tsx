import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import type { PartialBlock } from "@blocknote/core";
import { useEffect, useRef, useState } from "react";
import { updatePageContent } from "@/lib/page.api";
import { uploadFile } from "@/lib/upload";
import { useThemeStore } from "@/stores/theme.store";

const AUTOSAVE_DEBOUNCE_MS = 500;

interface Props {
  pageId: string;
  initialContent: unknown[] | null;
}

/**
 * Editor konten berbasis BlockNote dengan autosave debounce (last-write-wins).
 * Di-remount per halaman via `key={pageId}` sehingga initialContent selalu segar.
 */
export function PageEditor({ pageId, initialContent }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useCreateBlockNote({
    initialContent:
      initialContent && initialContent.length > 0 ? (initialContent as PartialBlock[]) : undefined,
    uploadFile,
  });

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function scheduleSave(): void {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      updatePageContent(pageId, editor.document as unknown[])
        .then(() => setStatus("saved"))
        .catch(() => setStatus("error"));
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  return (
    <div>
      <div className="mb-1 h-4 text-right text-xs text-muted-foreground">
        {status === "saving" && "Menyimpan…"}
        {status === "saved" && "Tersimpan"}
        {status === "error" && <span className="text-destructive">Gagal menyimpan</span>}
      </div>
      <BlockNoteView editor={editor} theme={theme} onChange={scheduleSave} />
    </div>
  );
}
