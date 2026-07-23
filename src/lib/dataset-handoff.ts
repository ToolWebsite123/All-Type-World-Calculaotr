// Lightweight in-browser dataset handoff between statistics calculators.
// Uses sessionStorage so the receiving page can pre-populate its textarea
// on mount without leaking large numeric payloads through the URL.

const KEY_PREFIX = "lovable:dataset-handoff:";

export interface StatsCalcTarget {
  path: string;
  label: string;
  short: string;
}

export const STATS_TARGETS: StatsCalcTarget[] = [
  {
    path: "/calculators/math/standard-deviation-calculator",
    label: "Standard Deviation Calculator",
    short: "Standard Deviation",
  },
  {
    path: "/calculators/math/mean-median-mode-calculator",
    label: "Mean, Median, Mode & Range Calculator",
    short: "Mean / Median / Mode",
  },
  {
    path: "/calculators/math/statistics-calculator",
    label: "Statistics Calculator",
    short: "Statistics",
  },
];

export function stashDataset(targetPath: string, raw: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY_PREFIX + targetPath, raw);
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function consumeDataset(targetPath: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = KEY_PREFIX + targetPath;
    const value = window.sessionStorage.getItem(key);
    if (value !== null) window.sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}
