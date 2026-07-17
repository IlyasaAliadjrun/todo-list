import { Check, ChevronDown } from "lucide-react";
import { FloatingMenu } from "@/components/ui/FloatingMenu";

export interface SelectMenuOption {
  value: string;
  label: string;
  /** Bila diisi, label ditampilkan sebagai badge berwarna (dipakai opsi SELECT). */
  badgeClass?: string;
}

/**
 * Dropdown bergaya aplikasi (menggantikan <select> native): warnanya mengikuti
 * token tema, mendukung badge berwarna, dan menunya dirender via portal sehingga
 * tak ter-clip oleh kontainer overflow.
 */
export function SelectMenu({
  value,
  options,
  onChange,
  placeholder = "—",
  ariaLabel,
  width = 200,
  triggerClassName,
}: {
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  width?: number;
  triggerClassName?: string;
}) {
  const selected = options.find((o) => o.value === value);

  const renderLabel = (o: SelectMenuOption) =>
    o.badgeClass ? (
      <span className={`truncate rounded px-1.5 py-0.5 text-xs font-medium ${o.badgeClass}`}>
        {o.label}
      </span>
    ) : (
      <span className="truncate">{o.label}</span>
    );

  return (
    <FloatingMenu
      ariaLabel={ariaLabel}
      width={width}
      triggerClassName={
        triggerClassName ??
        "flex w-full min-w-0 cursor-pointer items-center justify-between gap-1 rounded px-1 py-0.5 text-left text-sm hover:bg-secondary/60"
      }
      trigger={
        <>
          {selected ? (
            renderLabel(selected)
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </>
      }
    >
      {(close) => (
        <div className="space-y-0.5">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                close();
              }}
              className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-secondary"
            >
              <span className="min-w-0 flex-1">{renderLabel(o)}</span>
              {o.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </FloatingMenu>
  );
}
