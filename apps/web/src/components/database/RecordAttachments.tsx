import type { RowAttachment } from "@notion/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { getRowAttachments, setRowAttachments } from "@/lib/database.api";
import { uploadFile } from "@/lib/upload";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Bagian lampiran file pada panel record: upload (presigned S3) + daftar + hapus. */
export function RecordAttachments({ rowId }: { rowId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: list = [] } = useQuery({
    queryKey: ["row-attachments", rowId],
    queryFn: () => getRowAttachments(rowId),
  });

  const save = (next: RowAttachment[]) => {
    qc.setQueryData(["row-attachments", rowId], next);
    void setRowAttachments(rowId, next);
  };

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadFile(file);
      return { name: file.name, url, size: file.size } satisfies RowAttachment;
    },
    onSuccess: (att) => save([...list, att]),
    onError: (e) => setError(e instanceof Error ? e.message : "Gagal mengunggah"),
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Lampiran
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
        >
          <Paperclip className="h-3.5 w-3.5" />
          {upload.isPending ? "Mengunggah…" : "Tambah lampiran"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            setError(null);
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {list.length > 0 && (
        <ul className="space-y-1">
          {list.map((att, i) => (
            <li
              key={`${att.url}-${i}`}
              className="group/att flex items-center gap-2 rounded border bg-muted/30 px-2 py-1 text-sm"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate hover:underline"
                title={att.name}
              >
                {att.name}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtSize(att.size)}</span>
              <button
                type="button"
                onClick={() => save(list.filter((_, idx) => idx !== i))}
                aria-label="Hapus lampiran"
                className="shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover/att:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
