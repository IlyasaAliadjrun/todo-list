import "@blocknote/core/fonts/inter.css";
import { filterSuggestionItems, insertOrUpdateBlock, type PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { Table } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { editorSchema } from "@/components/page/blocks/database-block";
import { createDatabase } from "@/lib/database.api";
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
    schema: editorSchema,
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
      <BlockNoteView editor={editor} theme={theme} onChange={scheduleSave} slashMenu={false}>
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getDefaultReactSlashMenuItems(editor),
                {
                  title: "Database",
                  subtext: "Tabel sederhana",
                  aliases: ["database", "tabel", "table"],
                  group: "Lanjutan",
                  icon: <Table size={18} />,
                  onItemClick: async () => {
                    const db = await createDatabase({ pageId });
                    insertOrUpdateBlock(editor, {
                      type: "database",
                      props: { databaseId: db.id },
                    });
                  },
                },
              ],
              query,
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}
