import type { DatabaseProperty, PropertyType } from "@notion/shared";
import { useEffect, useState } from "react";
import { FloatingMenu } from "./FloatingMenu";
import { PersonAvatar, optionBadgeClass, personLabel, usePeople } from "./database-shared";

interface Props {
  property: DatabaseProperty;
  value: unknown;
  onCommit: (value: unknown) => void;
}

const baseInput = "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground";

function TextlikeCell({
  type,
  value,
  onCommit,
}: {
  type: PropertyType;
  value: unknown;
  onCommit: (v: unknown) => void;
}) {
  const asString = value == null ? "" : String(value);
  const [draft, setDraft] = useState(asString);
  useEffect(() => setDraft(asString), [asString]);

  return (
    <input
      type={type === "NUMBER" ? "number" : type === "URL" ? "url" : "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== asString) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      placeholder={type === "URL" ? "https://…" : ""}
      className={baseInput}
    />
  );
}

function MultiSelectCell({
  property,
  value,
  onCommit,
}: {
  property: DatabaseProperty;
  value: string[];
  onCommit: (v: unknown) => void;
}) {
  const selected = new Set(value);
  return (
    <FloatingMenu
      ariaLabel="Pilih opsi"
      width={180}
      triggerClassName="flex min-h-5 w-full cursor-pointer flex-wrap items-center gap-1 text-left"
      trigger={
        value.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          value.map((id) => {
            const o = property.options.find((x) => x.id === id);
            return (
              <span
                key={id}
                className={`rounded px-1.5 text-xs ${optionBadgeClass(o?.color)}`}
              >
                {o?.name ?? id}
              </span>
            );
          })
        )
      }
    >
      {() => (
        <>
          {property.options.length === 0 && (
            <p className="px-1 py-0.5 text-xs text-muted-foreground">Belum ada opsi</p>
          )}
          {property.options.map((o) => (
            <label
              key={o.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-secondary"
            >
              <input
                type="checkbox"
                checked={selected.has(o.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(o.id);
                  else next.delete(o.id);
                  onCommit([...next]);
                }}
              />
              {o.name}
            </label>
          ))}
        </>
      )}
    </FloatingMenu>
  );
}

/** Pemilih anggota workspace untuk properti PERSON (nilai = array userId). */
function PersonCell({ value, onCommit }: { value: string[]; onCommit: (v: unknown) => void }) {
  const people = usePeople();
  const selected = new Set(value);
  const chosen = value.map((id) => people.find((p) => p.userId === id)).filter(Boolean);

  return (
    <FloatingMenu
      ariaLabel="Pilih orang"
      width={220}
      triggerClassName="flex min-h-5 w-full cursor-pointer flex-wrap items-center gap-1 text-left"
      trigger={
        chosen.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          chosen.map((m) => (
            <span
              key={m!.userId}
              className="inline-flex items-center gap-1 rounded bg-secondary px-1 py-0.5 text-xs"
            >
              <PersonAvatar member={m!} />
              <span className="max-w-[7rem] truncate">{personLabel(m!)}</span>
            </span>
          ))
        )
      }
    >
      {() => (
        <>
          {people.length === 0 && (
            <p className="px-1 py-0.5 text-xs text-muted-foreground">Tak ada anggota</p>
          )}
          {people.map((m) => (
            <label
              key={m.userId}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-secondary"
            >
              <input
                type="checkbox"
                checked={selected.has(m.userId)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(m.userId);
                  else next.delete(m.userId);
                  onCommit([...next]);
                }}
              />
              <PersonAvatar member={m} size={18} />
              <span className="min-w-0 flex-1 truncate">{personLabel(m)}</span>
            </label>
          ))}
        </>
      )}
    </FloatingMenu>
  );
}

export function CellEditor({ property, value, onCommit }: Props) {
  switch (property.type) {
    case "CHECKBOX":
      return (
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onCommit(e.target.checked)}
          className="h-4 w-4"
        />
      );
    case "SELECT":
      return (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onCommit(e.target.value)}
          className={baseInput}
        >
          <option value="">—</option>
          {property.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      );
    case "MULTI_SELECT":
      return (
        <MultiSelectCell
          property={property}
          value={Array.isArray(value) ? (value as string[]) : []}
          onCommit={onCommit}
        />
      );
    case "PERSON":
      return (
        <PersonCell value={Array.isArray(value) ? (value as string[]) : []} onCommit={onCommit} />
      );
    case "DATE":
      return (
        <input
          type="date"
          value={typeof value === "string" ? value.slice(0, 10) : ""}
          onChange={(e) => onCommit(e.target.value)}
          className={baseInput}
        />
      );
    default:
      return <TextlikeCell type={property.type} value={value} onCommit={onCommit} />;
  }
}
