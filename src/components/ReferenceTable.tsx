import type { ReactNode } from "react";

/**
 * Reusable reference/lookup table for calculator pages.
 * Handles horizontal overflow on mobile by wrapping in a scroll container,
 * so tables never break the page layout.
 */
export interface ReferenceTableProps {
  caption?: string;
  headers: ReactNode[];
  rows: ReactNode[][];
  /** Right-align + tabular-nums for numeric columns (index of columns). */
  numericColumns?: number[];
}

export function ReferenceTable({
  caption,
  headers,
  rows,
  numericColumns = [],
}: ReferenceTableProps) {
  const isNumeric = (i: number) => numericColumns.includes(i);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60">
      <table className="min-w-full text-left text-sm">
        {caption && (
          <caption className="border-b border-border/60 bg-secondary/30 px-3 py-2 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {caption}
          </caption>
        )}
        <thead className="bg-secondary/40 text-foreground">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={
                  "px-3 py-2 font-semibold " +
                  (isNumeric(i) ? "text-right tabular-nums" : "")
                }
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-foreground">
          {rows.map((row, r) => (
            <tr key={r} className="odd:bg-background/40">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={
                    "px-3 py-2 " +
                    (isNumeric(c) ? "text-right tabular-nums" : "")
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
