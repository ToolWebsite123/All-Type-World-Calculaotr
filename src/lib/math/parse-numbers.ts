// Shared numeric-dataset parser used by every calculator that accepts a
// freeform list of numbers (Standard Deviation, Mean/Median/Mode, Statistics,
// etc.). Handles commas, spaces, tabs, semicolons, and any mix of Windows/Mac/
// Unix line endings, and gracefully strips currency symbols, thousand
// separators, and stray wrapping punctuation before parsing.

export interface ParsedDataset {
  values: number[];
  /** Number of tokens where we had to strip characters (currency, thousands
   *  commas, brackets, trailing punctuation) to recover a valid number. */
  cleaned: number;
  /** Tokens we could not parse even after cleaning. */
  invalid: string[];
}

/** Parse a freeform string of numbers pasted from spreadsheets, docs, etc. */
export function parseDataset(input: string): ParsedDataset {
  // Normalise line endings (Windows \r\n and old-Mac \r → \n).
  const normalised = input.replace(/\r\n?/g, "\n");

  // Strip thousand-separator commas *inside* numbers ("1,200,500" → "1200500")
  // before we split on commas. Loop until no more matches so runs of groups
  // collapse fully.
  let noThousands = normalised;
  const thousands = /(\d),(?=\d{3}(?!\d))/g;
  while (thousands.test(noThousands)) {
    noThousands = noThousands.replace(thousands, "$1");
  }

  const tokens = noThousands
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const values: number[] = [];
  const invalid: string[] = [];
  let cleaned = 0;

  for (const tok of tokens) {
    // Strip currency symbols, brackets/parens, and any leftover non-numeric
    // padding around the number. Keep digits, sign, decimal point, and
    // scientific-notation markers.
    let stripped = tok.replace(/[$€£¥₹₽¢]/g, "");
    // Accounting negatives: "(1200.50)" → "-1200.50"
    const paren = stripped.match(/^\((.+)\)$/);
    if (paren) stripped = "-" + paren[1];
    // Trim any remaining junk characters from either end.
    stripped = stripped.replace(/^[^\d+\-.]+|[^\d.eE+\-]+$/g, "");

    if (stripped !== tok) cleaned++;

    if (stripped === "" || stripped === "-" || stripped === "+") {
      invalid.push(tok);
      continue;
    }
    const n = Number(stripped);
    if (!Number.isFinite(n)) {
      invalid.push(tok);
      continue;
    }
    values.push(n);
  }

  return { values, cleaned, invalid };
}

/** Build a short "cleaned N values" note for display beneath results. */
export function cleanedNote(cleaned: number): string | null {
  if (cleaned <= 0) return null;
  return `Cleaned ${cleaned} value${cleaned === 1 ? "" : "s"} (stripped currency symbols, thousand separators or stray punctuation).`;
}
