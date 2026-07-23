import { History, X } from "lucide-react";

export interface RecentEntry {
  id: string;
  label: string;
  params: { percent: string; value: string };
  at: number;
}

const KEY = "pct-calc:recent:v1";
const MAX = 5;

export function loadRecent(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, MAX);
  } catch {
    return [];
  }
}

/** Prepend an entry (dedup by label) and persist. Pass null to clear. */
export function saveRecent(entry: RecentEntry | null): RecentEntry[] {
  if (typeof window === "undefined") return [];
  if (entry === null) {
    window.localStorage.removeItem(KEY);
    return [];
  }
  const cur = loadRecent().filter((e) => e.label !== entry.label);
  const next = [entry, ...cur].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / privacy mode */
  }
  return next;
}

export function RecentCalculations({
  items,
  onSelect,
  onClear,
}: {
  items: RecentEntry[];
  onSelect: (e: RecentEntry) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-border/60 bg-background/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4 text-primary" />
          Recent calculations
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          aria-label="Clear recent calculations"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      </div>
      <ul className="divide-y divide-border/40">
        {items.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onSelect(e)}
              className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm text-foreground hover:text-primary"
            >
              <span className="tabular-nums">{e.label}</span>
              <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                Reload
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
