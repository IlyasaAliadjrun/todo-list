import "@blocknote/core/fonts/inter.css";
import type { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { getRowContent, setRowContent } from "@/lib/database.api";
import { useThemeStore } from "@/stores/theme.store";

const AUTOSAVE_MS = 600;

function NotesEditor({ rowId, initial }: { rowId: string; initial: PartialBlock[] | undefined }) {
  const theme = useThemeStore((s) => s.theme);
  const qc = useQueryClient();
  const editor = useCreateBlockNote({ initialContent: initial });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      className="-mx-3 min-h-[8rem]"
      onChange={() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const doc = editor.document as unknown as unknown[];
          // Perbarui cache agar buka-ulang menampilkan versi terbaru (editor init sekali).
          qc.setQueryData(["row-content", rowId], doc);
          void setRowContent(rowId, doc);
        }, AUTOSAVE_MS);
      }}
    />
  );
}

/**
 * Editor catatan (BlockNote) untuk satu record — seperti isi halaman Notion per baris.
 * Non-kolaboratif; autosave debounce ke `PUT /rows/:id/content`.
 */
export function RecordNotes({ rowId }: { rowId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["row-content", rowId],
    queryFn: () => getRowContent(rowId),
  });

  if (isLoading)
    return <p className="px-1 py-2 text-xs text-muted-foreground">Memuat catatan…</p>;

  const initial = data && data.length ? (data as PartialBlock[]) : undefined;
  return <NotesEditor key={rowId} rowId={rowId} initial={initial} />;
}
