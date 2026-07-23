import { useMemo } from "react";

export interface GroupedRow {
  value: string;
  frequency: string;
}

export type InputMode = "raw" | "grouped";

/** Expand grouped rows into a flat array of numbers. Returns invalid info too. */
export function expandGroupedRows(rows: GroupedRow[]): {
  values: number[];
  invalid?: string;
} {
  const out: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const vStr = r.value.trim();
    const fStr = r.frequency.trim();
    if (vStr === "" && fStr === "") continue;
    const v = Number(vStr.replace(/[, ]/g, ""));
    const f = Number(fStr);
    if (!Number.isFinite(v)) return { values: [], invalid: `Row ${i + 1}: "${r.value}" is not a valid number` };
    if (!Number.isFinite(f) || !Number.isInteger(f) || f < 1)
      return { values: [], invalid: `Row ${i + 1}: frequency must be a positive integer` };
    if (f > 100000) return { values: [], invalid: `Row ${i + 1}: frequency too large (max 100,000)` };
    for (let j = 0; j < f; j++) out.push(v);
  }
  return { values: out };
}

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: InputMode;
  onChange: (m: InputMode) => void;
}) {
  const opts: { key: InputMode; label: string }[] = [
    { key: "raw", label: "Raw data" },
    { key: "grouped", label: "Grouped data (value + frequency)" },
  ];
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Input mode">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={mode === o.key}
          onClick={() => onChange(o.key)}
          className={
            "rounded-full border px-4 py-1.5 text-sm transition-colors " +
            (mode === o.key
              ? "border-primary bg-primary/15 text-foreground"
              : "border-border bg-background/40 text-muted-foreground hover:border-primary/40")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function GroupedTable({
  rows,
  onChange,
}: {
  rows: GroupedRow[];
  onChange: (rows: GroupedRow[]) => void;
}) {
  const total = useMemo(() => {
    let sum = 0;
    for (const r of rows) {
      const f = Number(r.frequency);
      if (Number.isFinite(f) && Number.isInteger(f) && f > 0) sum += f;
    }
    return sum;
  }, [rows]);

  const update = (i: number, patch: Partial<GroupedRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const addRow = () => onChange([...rows, { value: "", frequency: "1" }]);
  const removeRow = (i: number) =>
    onChange(rows.length <= 1 ? rows : rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Value</th>
              <th className="px-3 py-2 text-left font-semibold">Frequency</th>
              <th className="w-16 px-2 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border/60">
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={r.value}
                    onChange={(e) => update(i, { value: e.target.value })}
                    className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 font-mono text-sm tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="e.g. 23"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={r.frequency}
                    onChange={(e) => update(i, { frequency: e.target.value })}
                    className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 font-mono text-sm tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="1"
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                    aria-label={`Remove row ${i + 1}`}
                    className="rounded-md border border-border/60 bg-background/60 px-2 py-1 text-xs text-muted-foreground hover:border-destructive/60 hover:text-destructive disabled:opacity-40"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
        >
          + Add row
        </button>
        <div className="text-xs text-muted-foreground">
          Total observations (Σf): <span className="font-mono tabular-nums text-foreground">{total}</span>
        </div>
      </div>
    </div>
  );
}
