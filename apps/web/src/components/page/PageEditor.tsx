import "@blocknote/core/fonts/inter.css";
import { filterSuggestionItems, insertOrUpdateBlock, type PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { Table, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { editorSchema } from "@/components/page/blocks/database-block";
import { createDatabase } from "@/lib/database.api";
import { updatePageContent } from "@/lib/page.api";
import { uploadFile } from "@/lib/upload";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";

const AUTOSAVE_DEBOUNCE_MS = 500;
const CURSOR_COLORS = ["#e11d48", "#7c3aed", "#0891b2", "#059669", "#d97706", "#2563eb"];

function colorFor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

function collabWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/collab`;
}

interface Props {
  pageId: string;
  initialContent: unknown[] | null;
}

/**
 * Editor BlockNote dengan kolaborasi real-time (Yjs + Hocuspocus). Yjs = sumber
 * kebenaran real-time; Page.content (JSON) tetap di-autosave sebagai snapshot.
 * Di-remount per halaman via key={pageId}. Lihat ADR 0007.
 */
export function PageEditor({ pageId, initialContent }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [online, setOnline] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seeded = useRef(false);

  const { ydoc, provider } = useMemo(() => {
    const doc = new Y.Doc();
    const prov = new HocuspocusProvider({
      url: collabWsUrl(),
      name: pageId,
      token: token ?? "",
      document: doc,
      onStatus: ({ status: s }) => setOnline(s === "connected"),
    });
    // token dibaca sekali saat mount; pergantian token tak me-reconnect (backlog).
    return { ydoc: doc, provider: prov };
  }, [pageId]);

  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  const editor = useCreateBlockNote(
    {
      schema: editorSchema,
      uploadFile,
      collaboration: {
        provider,
        fragment: ydoc.getXmlFragment("document-store"),
        user: {
          name: user?.name || user?.email || "Anonim",
          color: colorFor(user?.id ?? "anon"),
        },
      },
    },
    [provider],
  );

  // Migrasi sekali: bila dokumen Yjs masih kosong tapi ada snapshot JSON, seed.
  useEffect(() => {
    const onSynced = (): void => {
      if (seeded.current) return;
      seeded.current = true;
      const doc = editor.document;
      const empty =
        doc.length <= 1 &&
        (!doc[0] || (doc[0].type === "paragraph" && (doc[0].content as unknown[]).length === 0));
      if (empty && initialContent && initialContent.length > 0) {
        editor.replaceBlocks(editor.document, initialContent as PartialBlock[]);
      }
    };
    provider.on("synced", onSynced);
    return () => {
      provider.off("synced", onSynced);
    };
  }, [provider, editor, initialContent]);

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
      <div className="mb-1 flex h-4 items-center justify-end gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {online ? (
            <>
              <Wifi className="h-3 w-3 text-emerald-500" /> Live
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" /> Offline
            </>
          )}
        </span>
        <span aria-hidden>·</span>
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
